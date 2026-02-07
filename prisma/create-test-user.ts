/**
 * Script to create/update a test user in the database.
 *
 * SECURITY NOTES:
 * - This script is gated to non-production environments
 * - Credentials are read from environment variables or prompted
 * - Use with caution in shared environments
 *
 * Usage:
 *   TEST_USER_EMAIL=test@example.com TEST_USER_PASSWORD=securepass123 npx ts-node prisma/create-test-user.ts
 *
 * Or with confirmation for hardcoded defaults (development only):
 *   CONFIRM_TEST_USER=1 npx ts-node prisma/create-test-user.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    // Guard: Block execution in production
    if (process.env.NODE_ENV === 'production') {
        console.error('❌ ERROR: This script cannot run in production environment.')
        console.error('   Set NODE_ENV to "development" or "test" to use this script.')
        process.exit(1)
    }

    // Read credentials from environment variables
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD
    const name = process.env.TEST_USER_NAME || 'Test User'

    // Validate credentials are provided
    if (!email || !password) {
        console.error('❌ ERROR: Missing required environment variables.')
        console.error('')
        console.error('   Please set:')
        console.error('     TEST_USER_EMAIL=your-email@example.com')
        console.error('     TEST_USER_PASSWORD=your-secure-password')
        console.error('')
        console.error('   Optional:')
        console.error('     TEST_USER_NAME="Your Name"')
        console.error('')
        console.error('   Example:')
        console.error('     TEST_USER_EMAIL=test@example.com TEST_USER_PASSWORD=test123 npx ts-node prisma/create-test-user.ts')
        process.exit(1)
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
        console.error('❌ ERROR: Password must be at least 8 characters long.')
        process.exit(1)
    }

    // Require confirmation to prevent accidental execution
    if (process.env.CONFIRM_TEST_USER !== '1') {
        console.log('⚠️  WARNING: This will create/update a user in the database.')
        console.log(`   Email: ${email}`)
        console.log(`   Name: ${name}`)
        console.log('')
        console.log('   To proceed, set CONFIRM_TEST_USER=1')
        console.log('')
        console.log('   Example:')
        console.log(`     CONFIRM_TEST_USER=1 TEST_USER_EMAIL=${email} TEST_USER_PASSWORD=*** npx ts-node prisma/create-test-user.ts`)
        process.exit(0)
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.upsert({
        where: { email },
        update: { passwordHash, name },
        create: {
            email,
            name,
            passwordHash,
        },
    })

    console.log('✅ User created/updated in DB:', user.email)
}

main()
    .catch((e) => {
        console.error('❌ Error:', e.message)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
