# 1. Create a sibling folder 'resume-master' for the master branch
git worktree add ../resume-master master

# 2. Enter the new folder
cd ../resume-master

# 3. Install dependencies for that branch
pnpm install

# 4. Copy your environment variables
Copy-Item ../resume-builder-ts/.env -Destination .

# 5. Start the server on a different port (3001)
pnpm exec next dev -p 3001


# Run from your main project folder
git worktree remove ../resume-master