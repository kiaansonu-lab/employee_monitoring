const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncEnums() {
    console.log('Syncing database ENUMs with Prisma schema...');
    
    try {
        // 1. Fix employees table status enum
        console.log('Updating employees.status enum...');
        await prisma.$executeRawUnsafe(`
            ALTER TABLE employees 
            MODIFY COLUMN status ENUM('INVITED','ACTIVE','OFFLINE','IDLE','BREAK','DEACTIVATED','MERGED') 
            NOT NULL DEFAULT 'ACTIVE'
        `);
        console.log('employees.status updated.');

        // 2. Fix activity_logs table activityType enum
        console.log('Updating activity_logs.activityType enum...');
        await prisma.$executeRawUnsafe(`
            ALTER TABLE activity_logs 
            MODIFY COLUMN activityType ENUM('ACTIVE','IDLE','MANUAL','SYSTEM','BREAK') 
            NOT NULL DEFAULT 'ACTIVE'
        `);
        console.log('activity_logs.activityType updated.');

        console.log('All enums synced successfully!');

    } catch (err) {
        console.error('Migration failed:', err);
        if (err.message.includes('1146')) {
            console.error('Table not found. Please check if table names are lowercase (mapped) or uppercase.');
        }
    } finally {
        await prisma.$disconnect();
    }
}

syncEnums();
