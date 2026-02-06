import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    const email = 'dbuser@example.com'
    const password = 'dbpassword123'
    const name = 'DB Created User'

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.upsert({
        where: { email },
        update: { passwordHash },
        create: {
            email,
            name,
            passwordHash,
        },
    })

    console.log('User created/updated in DB:', user.email)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
