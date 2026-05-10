/**
 * migrate-wxid-to-unionid.mjs
 *
 * One-time script: updates Prisma User.wxId from legacy cvUserId (numeric string)
 * to the corresponding unionid fetched from the Java backend.
 *
 * Run ONCE before deploying the new unionid-based login flow to production.
 *
 * Usage:
 *   node scripts/migrate-wxid-to-unionid.mjs [--dry-run]
 *
 * Prerequisites:
 *   - DATABASE_URL env var set (same as Next.js app)
 *   - Java backend reachable at JAVA_API_BASE_URL (or https://aijianli.cn/api)
 */

import { PrismaClient } from '@prisma/client'

const DRY_RUN = process.argv.includes('--dry-run')
const JAVA_API_BASE = process.env.NEXT_PUBLIC_JAVA_API_BASE_URL || 'https://aijianli.cn/api'

const prisma = new PrismaClient()

/** Returns true when the string looks like a legacy numeric cvUserId */
function isNumericId(value) {
  return /^\d+$/.test(value)
}

/**
 * Fetch unionid for a given cvUserId from Java backend.
 * @param {string} cvUserId
 * @returns {Promise<string|null>}
 */
async function fetchUnionid(cvUserId) {
  try {
    const res = await fetch(`${JAVA_API_BASE}/cvstore/user/${cvUserId}/unionid`)
    if (!res.ok) {
      console.warn(`  [WARN] Java returned ${res.status} for cvUserId=${cvUserId}`)
      return null
    }
    const body = await res.json()
    return body?.data?.unionid ?? null
  } catch (err) {
    console.error(`  [ERROR] fetch failed for cvUserId=${cvUserId}:`, err.message)
    return null
  }
}

async function main() {
  console.log(`=== migrate-wxid-to-unionid (${DRY_RUN ? 'DRY RUN' : 'LIVE'}) ===`)
  console.log(`Java API: ${JAVA_API_BASE}\n`)

  const users = await prisma.user.findMany({
    where: { wxId: { not: null } },
    select: { id: true, wxId: true, name: true },
  })

  const numericUsers = users.filter(u => isNumericId(u.wxId))
  console.log(`Total users with wxId: ${users.length}`)
  console.log(`Users with numeric cvUserId: ${numericUsers.length}\n`)

  if (numericUsers.length === 0) {
    console.log('Nothing to migrate.')
    return
  }

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const user of numericUsers) {
    const cvUserId = user.wxId
    process.stdout.write(`User ${user.id} (cvUserId=${cvUserId}) → `)

    const unionid = await fetchUnionid(cvUserId)
    if (!unionid) {
      console.log('SKIP (no unionid returned)')
      skipped++
      continue
    }

    // Check if another User already has this unionid
    const existing = await prisma.user.findUnique({ where: { wxId: unionid } })
    if (existing && existing.id !== user.id) {
      console.log(`SKIP (unionid=${unionid} already owned by User ${existing.id})`)
      skipped++
      continue
    }

    console.log(`unionid=${unionid}`)
    if (!DRY_RUN) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { wxId: unionid },
        })
        updated++
      } catch (err) {
        console.error(`  [ERROR] DB update failed:`, err.message)
        failed++
      }
    } else {
      updated++
    }
  }

  console.log(`\n=== Done ===`)
  console.log(`Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`)
  if (DRY_RUN) console.log('(dry-run — no changes written)')
}

main()
  .catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
