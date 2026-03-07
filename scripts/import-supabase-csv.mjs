import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')
const SUPABASE_DIR = path.resolve(PROJECT_ROOT, 'files', 'supabase')
const ENV_PATH = path.resolve(PROJECT_ROOT, '.env')
const prisma = new PrismaClient()

function parseEnvLine(line) {
  const trimmedLine = line.trim()
  if (!trimmedLine || trimmedLine.startsWith('#')) {
    return null
  }
  const separatorIndex = trimmedLine.indexOf('=')
  if (separatorIndex < 0) {
    return null
  }
  const key = trimmedLine.slice(0, separatorIndex).trim()
  let value = trimmedLine.slice(separatorIndex + 1).trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  return { key, value }
}

async function loadEnvFile() {
  try {
    const envContent = await fs.readFile(ENV_PATH, 'utf8')
    const envLines = envContent.split(/\r?\n/)
    for (const line of envLines) {
      const parsedLine = parseEnvLine(line)
      if (!parsedLine) {
        continue
      }
      if (!process.env[parsedLine.key]) {
        process.env[parsedLine.key] = parsedLine.value
      }
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return
    }
    throw error
  }
}

function normalizeNullable(value) {
  if (value == null) {
    return null
  }
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return null
  }
  if (trimmedValue.toUpperCase() === 'NULL') {
    return null
  }
  return value
}

function parseDateValue(value) {
  const normalizedValue = normalizeNullable(value)
  return normalizedValue ? new Date(normalizedValue) : null
}

function parseJsonValue(value, filePath, rowIndex) {
  const normalizedValue = normalizeNullable(value)
  if (!normalizedValue) {
    return null
  }
  try {
    return JSON.parse(normalizedValue)
  } catch (error) {
    throw new Error(`Failed to parse JSON in ${path.basename(filePath)} at row ${rowIndex}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function parseCsv(content) {
  const rows = []
  let currentField = ''
  let currentRow = []
  let inQuotes = false
  let index = 0
  while (index < content.length) {
    const character = content[index]
    const nextCharacter = content[index + 1]
    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentField += '"'
        index += 2
        continue
      }
      inQuotes = !inQuotes
      index += 1
      continue
    }
    if (!inQuotes && character === ',') {
      currentRow.push(currentField)
      currentField = ''
      index += 1
      continue
    }
    if (!inQuotes && (character === '\n' || character === '\r')) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1
      }
      currentRow.push(currentField)
      currentField = ''
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      index += 1
      continue
    }
    currentField += character
    index += 1
  }
  currentRow.push(currentField)
  if (currentRow.some((field) => field.length > 0)) {
    rows.push(currentRow)
  }
  if (rows.length === 0) {
    return []
  }
  const header = rows[0]
  return rows.slice(1).map((row, rowIndex) => {
    const record = {}
    for (let headerIndex = 0; headerIndex < header.length; headerIndex += 1) {
      record[header[headerIndex]] = row[headerIndex] ?? ''
    }
    record.__rowIndex = rowIndex + 2
    return record
  })
}

async function readCsvRecords(filePath) {
  const csvContent = await fs.readFile(filePath, 'utf8')
  return parseCsv(csvContent)
}

function buildUserPayload(record, createdAt, updatedAt) {
  return {
    clerkId: normalizeNullable(record.clerkId),
    email: normalizeNullable(record.email),
    avatar: normalizeNullable(record.avatar),
    name: normalizeNullable(record.name),
    wxId: normalizeNullable(record.wxId),
    createdAt,
    updatedAt,
  }
}

async function findExistingUser(record) {
  const wxId = normalizeNullable(record.wxId)
  if (record.id) {
    const userById = await prisma.user.findUnique({ where: { id: record.id } })
    if (userById) {
      return userById
    }
  }
  if (wxId) {
    const userByWxId = await prisma.user.findUnique({ where: { wxId } })
    if (userByWxId) {
      return userByWxId
    }
  }
  const clerkId = normalizeNullable(record.clerkId)
  if (clerkId) {
    const userByClerkId = await prisma.user.findUnique({ where: { clerkId } })
    if (userByClerkId) {
      return userByClerkId
    }
  }
  const email = normalizeNullable(record.email)
  if (email) {
    const userByEmail = await prisma.user.findUnique({ where: { email } })
    if (userByEmail) {
      return userByEmail
    }
  }
  return null
}

function resolveUserId(userIdMap, userId) {
  const normalizedUserId = normalizeNullable(userId)
  if (!normalizedUserId) {
    return null
  }
  return userIdMap.get(normalizedUserId) ?? normalizedUserId
}

async function importUsers(filePath) {
  const records = await readCsvRecords(filePath)
  let importedCount = 0
  const userIdMap = new Map()
  for (const record of records) {
    const createdAt = parseDateValue(record.createdAt)
    const updatedAt = parseDateValue(record.updatedAt)
    if (!record.id || !createdAt || !updatedAt) {
      throw new Error(`Invalid user row in ${path.basename(filePath)} at row ${record.__rowIndex}`)
    }
    const payload = buildUserPayload(record, createdAt, updatedAt)
    const existingUser = await findExistingUser(record)
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: payload,
      })
      userIdMap.set(record.id, existingUser.id)
    } else {
      await prisma.user.create({
        data: {
          id: record.id,
          ...payload,
        },
      })
      userIdMap.set(record.id, record.id)
    }
    importedCount += 1
  }
  return { importedCount, userIdMap }
}

async function importResumes(filePaths, userIdMap) {
  let importedCount = 0
  for (const filePath of filePaths) {
    const records = await readCsvRecords(filePath)
    for (const record of records) {
      const createdAt = parseDateValue(record.createdAt)
      const updatedAt = parseDateValue(record.updatedAt)
      const content = parseJsonValue(record.content, filePath, record.__rowIndex)
      const userId = resolveUserId(userIdMap, record.userId)
      if (!record.id || !record.title || !content || !record.template || !userId || !createdAt || !updatedAt) {
        throw new Error(`Invalid resume row in ${path.basename(filePath)} at row ${record.__rowIndex}`)
      }
      await prisma.resume.upsert({
        where: { id: record.id },
        update: {
          title: record.title,
          content,
          template: record.template,
          thumbnail: normalizeNullable(record.thumbnail),
          userId,
          createdAt,
          updatedAt,
        },
        create: {
          id: record.id,
          title: record.title,
          content,
          template: record.template,
          thumbnail: normalizeNullable(record.thumbnail),
          userId,
          createdAt,
          updatedAt,
        },
      })
      importedCount += 1
    }
  }
  return importedCount
}

async function importFeedback(filePath, userIdMap) {
  const records = await readCsvRecords(filePath)
  let importedCount = 0
  for (const record of records) {
    const createdAt = parseDateValue(record.createdAt)
    if (!record.id || !record.content || !createdAt) {
      throw new Error(`Invalid feedback row in ${path.basename(filePath)} at row ${record.__rowIndex}`)
    }
    const userId = resolveUserId(userIdMap, record.userId)
    await prisma.feedback.upsert({
      where: { id: record.id },
      update: {
        content: record.content,
        contact: normalizeNullable(record.contact),
        attachment: normalizeNullable(record.attachment),
        userId,
        createdAt,
      },
      create: {
        id: record.id,
        content: record.content,
        contact: normalizeNullable(record.contact),
        attachment: normalizeNullable(record.attachment),
        userId,
        createdAt,
      },
    })
    importedCount += 1
  }
  return importedCount
}

async function getResumeCsvFiles() {
  const entries = await fs.readdir(SUPABASE_DIR, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^Supabase Snippet SQL Query( \(\d+\))?\.csv$/.test(name))
    .sort((leftName, rightName) => leftName.localeCompare(rightName, undefined, { numeric: true }))
    .map((name) => path.resolve(SUPABASE_DIR, name))
}

async function assertRequiredFiles(userFilePath, feedbackFilePath, resumeFilePaths) {
  const requiredPaths = [userFilePath, feedbackFilePath, ...resumeFilePaths]
  for (const requiredPath of requiredPaths) {
    try {
      await fs.access(requiredPath)
    } catch {
      throw new Error(`Missing required import file: ${requiredPath}`)
    }
  }
}

async function main() {
  await loadEnvFile()
  const userFilePath = path.resolve(SUPABASE_DIR, 'User_rows.csv')
  const feedbackFilePath = path.resolve(SUPABASE_DIR, 'Feedback_rows.csv')
  const resumeFilePaths = await getResumeCsvFiles()
  await assertRequiredFiles(userFilePath, feedbackFilePath, resumeFilePaths)
  console.log('Starting import...')
  console.log(`Resume files detected: ${resumeFilePaths.length}`)
  const { importedCount: userCount, userIdMap } = await importUsers(userFilePath)
  console.log(`Imported users: ${userCount}`)
  const resumeCount = await importResumes(resumeFilePaths, userIdMap)
  console.log(`Imported resumes: ${resumeCount}`)
  const feedbackCount = await importFeedback(feedbackFilePath, userIdMap)
  console.log(`Imported feedback rows: ${feedbackCount}`)
  console.log('Import completed successfully.')
}

main()
  .catch((error) => {
    console.error('Import failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
