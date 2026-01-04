/**
 * Production Seeder
 * Creates essential data for kickstarting the HRMS application:
 * - Permissions (all CRUD operations for each resource)
 * - Roles (super_admin, admin, hr, manager, employee)
 * - Super Admin user
 * - Default Department and Designation
 * 
 * This seeder uses upsert to avoid duplicating data on re-runs.
 * Run with: npm run seed:prod
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Resources and their CRUD actions
const resources = [
  'employees',
  'departments',
  'designations',
  'roles',
  'permissions',
  'leaves',
  'projects',
  'products',
  'events',
  'holidays',
  'policies',
  'documents',
  'job-openings',
  'referrals',
  'users',
  'audit-logs',
];

const actions = ['create', 'read', 'update', 'delete'];

async function main() {
  console.log('🚀 Starting production seeder...\n');

  // ============================================
  // 1. CREATE PERMISSIONS
  // ============================================
  console.log('📝 Creating permissions...');
  
  const permissionData = resources.flatMap((resource) =>
    actions.map((action) => ({
      name: `${resource}.${action}`,
      resource,
      action,
      description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
    }))
  );

  let permissionsCreated = 0;
  for (const perm of permissionData) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
    permissionsCreated++;
  }
  console.log(`   ✅ ${permissionsCreated} permissions ready\n`);

  // ============================================
  // 2. CREATE ROLES
  // ============================================
  console.log('👥 Creating roles...');

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'super_admin' },
    update: {},
    create: {
      name: 'super_admin',
      description: 'Super Administrator with full system access',
      isSystem: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator with most permissions',
      isSystem: true,
    },
  });

  const hrRole = await prisma.role.upsert({
    where: { name: 'hr' },
    update: {},
    create: {
      name: 'hr',
      description: 'HR Manager with employee and leave management access',
      isSystem: false,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'manager' },
    update: {},
    create: {
      name: 'manager',
      description: 'Manager with team management access',
      isSystem: false,
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'employee' },
    update: {},
    create: {
      name: 'employee',
      description: 'Regular employee with basic access',
      isSystem: true,
    },
  });

  console.log('   ✅ Roles created: super_admin, admin, hr, manager, employee\n');

  // ============================================
  // 3. ASSIGN ALL PERMISSIONS TO SUPER_ADMIN
  // ============================================
  console.log('🔐 Assigning permissions to super_admin...');

  const allPermissions = await prisma.permission.findMany();
  
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    });
  }
  console.log(`   ✅ ${allPermissions.length} permissions assigned to super_admin\n`);

  // Assign permissions to admin role (all except user management)
  const adminPermissions = allPermissions.filter(
    (p) => !['users.delete', 'roles.delete', 'permissions.delete'].includes(p.name)
  );

  for (const permission of adminPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }
  console.log(`   ✅ ${adminPermissions.length} permissions assigned to admin\n`);

  // Assign permissions to HR role
  const hrPermissions = allPermissions.filter((p) =>
    ['employees', 'leaves', 'departments', 'designations', 'holidays', 'policies', 'documents', 'job-openings', 'referrals'].includes(p.resource)
  );

  for (const permission of hrPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: hrRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: hrRole.id,
        permissionId: permission.id,
      },
    });
  }
  console.log(`   ✅ ${hrPermissions.length} permissions assigned to hr\n`);

  // Assign read permissions to employee role
  const employeePermissions = allPermissions.filter(
    (p) => p.action === 'read' && ['employees', 'departments', 'designations', 'holidays', 'policies', 'events'].includes(p.resource)
  );

  for (const permission of employeePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: employeeRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: employeeRole.id,
        permissionId: permission.id,
      },
    });
  }
  console.log(`   ✅ ${employeePermissions.length} permissions assigned to employee\n`);

  // ============================================
  // 4. CREATE DEFAULT DEPARTMENT
  // ============================================
  console.log('🏢 Creating default department...');

  const defaultDepartment = await prisma.department.upsert({
    where: { code: 'EXEC' },
    update: {},
    create: {
      name: 'Executive',
      code: 'EXEC',
      description: 'Executive Management',
      isActive: true,
    },
  });
  console.log('   ✅ Default department created: Executive (EXEC)\n');

  // ============================================
  // 5. CREATE DEFAULT DESIGNATION
  // ============================================
  console.log('💼 Creating default designation...');

  const defaultDesignation = await prisma.designation.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      name: 'System Administrator',
      code: 'ADMIN',
      description: 'System Administrator',
      level: 10,
      isActive: true,
    },
  });
  console.log('   ✅ Default designation created: System Administrator (ADMIN)\n');

  // ============================================
  // 6. CREATE SUPER ADMIN USER
  // ============================================
  console.log('👤 Creating super admin user...');

  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123';
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@azularc.com';

  const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

  const superAdminEmployee = await prisma.employee.upsert({
    where: { officeEmail: superAdminEmail },
    update: {
      password: hashedPassword, // Update password if re-running
    },
    create: {
      officeEmail: superAdminEmail,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      employeeCode: 'EMP-ADMIN',
      joiningDate: new Date(),
      departmentId: defaultDepartment.id,
      designationId: defaultDesignation.id,
      employmentType: 'Full-time',
      isActive: true,
      isEmailVerified: true,
      status: 'active',
    },
  });

  // Assign super_admin role to the user
  await prisma.employeeRole.upsert({
    where: {
      employeeId_roleId: {
        employeeId: superAdminEmployee.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      employeeId: superAdminEmployee.id,
      roleId: superAdminRole.id,
    },
  });

  console.log(`   ✅ Super Admin user created!`);
  console.log(`      📧 Email: ${superAdminEmail}`);
  console.log(`      🔑 Password: ${superAdminPassword}\n`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('═'.repeat(50));
  console.log('🎉 Production seeding completed successfully!');
  console.log('═'.repeat(50));
  console.log('\n📋 Summary:');
  console.log(`   • Permissions: ${permissionsCreated}`);
  console.log('   • Roles: 5 (super_admin, admin, hr, manager, employee)');
  console.log('   • Department: Executive (EXEC)');
  console.log('   • Designation: System Administrator (ADMIN)');
  console.log(`   • Super Admin: ${superAdminEmail}`);
  console.log('\n🔐 Login Credentials:');
  console.log(`   Email: ${superAdminEmail}`);
  console.log(`   Password: ${superAdminPassword}`);
  console.log('\n⚠️  Please change the password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

