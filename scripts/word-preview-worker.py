"""Private, serial UNO bridge. JSON lines on stdin/stdout; no listening TCP port."""
import json
import os
import subprocess
import sys
import time
import uuid
import uno
from com.sun.star.beans import PropertyValue
from com.sun.star.document.MacroExecMode import NEVER_EXECUTE


def prop(name, value):
    p = PropertyValue()
    p.Name, p.Value = name, value
    return p


def emit(value):
    print(json.dumps(value, ensure_ascii=True), flush=True)


def debug(message):
    if os.environ.get('WORD_PREVIEW_DEBUG') == '1':
        print(message, file=sys.stderr, flush=True)


binary, profile = sys.argv[1:3]
pipe = 'aijianli_' + uuid.uuid4().hex
office = subprocess.Popen([
    binary, '-env:UserInstallation=' + uno.systemPathToFileUrl(profile),
    '--headless', '--nologo', '--nodefault', '--norestore',
    '--accept=pipe,name=' + pipe + ';urp;StarOffice.ServiceManager',
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
desktop = None
try:
    local = uno.getComponentContext()
    resolver = local.ServiceManager.createInstanceWithContext('com.sun.star.bridge.UnoUrlResolver', local)
    deadline = time.monotonic() + 60
    while True:
        try:
            context = resolver.resolve('uno:pipe,name=' + pipe + ';urp;StarOffice.ComponentContext')
            break
        except Exception:
            if office.poll() is not None or time.monotonic() > deadline:
                raise RuntimeError('Word converter failed to start')
            time.sleep(0.1)
    desktop = context.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop', context)
    emit({'ready': True})
    for line in sys.stdin:
        job = json.loads(line)
        document = None
        result = {'id': job['id'], 'ok': False, 'error': 'Word conversion failed'}
        try:
            debug('loading')
            document = desktop.loadComponentFromURL(uno.systemPathToFileUrl(job['input']), '_blank', 0, (
                prop('Hidden', True), prop('ReadOnly', True),
                prop('UpdateDocMode', 0), prop('MacroExecutionMode', NEVER_EXECUTE),
            ))
            if document is None:
                raise RuntimeError('Unable to load Word document')
            debug('storing')
            document.storeToURL(uno.systemPathToFileUrl(job['output']), (
                prop('FilterName', 'writer_pdf_Export'), prop('Overwrite', True),
            ))
            debug('stored')
            result = {'id': job['id'], 'ok': True}
        except Exception:
            pass
        finally:
            if document is not None:
                debug('closing')
                # This is a hidden, read-only temporary document. Never negotiate
                # a save/close dialog, and finish disposal before Node removes files.
                document.setModified(False)
                document.dispose()
                debug('closed')
        emit(result)
finally:
    if desktop is not None:
        try:
            desktop.terminate()
        except Exception:
            pass
    try:
        office.wait(timeout=5)
    except subprocess.TimeoutExpired:
        office.kill()
