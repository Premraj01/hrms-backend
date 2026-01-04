import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (in correct order due to foreign keys)
  console.log('🗑️ Clearing existing data...');
  await prisma.holiday.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.leave.deleteMany({});
  await prisma.leaveBalance.deleteMany({});
  await prisma.employeeRole.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.designation.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.permission.deleteMany({});
  console.log('✅ Cleared existing data');

  // Create Permissions
  console.log('Creating permissions...');
  const permissions = [
    // User permissions
    { name: 'users.create', resource: 'users', action: 'create', description: 'Create new users' },
    { name: 'users.read', resource: 'users', action: 'read', description: 'View users' },
    { name: 'users.update', resource: 'users', action: 'update', description: 'Update users' },
    { name: 'users.delete', resource: 'users', action: 'delete', description: 'Delete users' },

    // Role permissions
    { name: 'roles.create', resource: 'roles', action: 'create', description: 'Create new roles' },
    { name: 'roles.read', resource: 'roles', action: 'read', description: 'View roles' },
    { name: 'roles.update', resource: 'roles', action: 'update', description: 'Update roles' },
    { name: 'roles.delete', resource: 'roles', action: 'delete', description: 'Delete roles' },

    // Employee permissions
    { name: 'employees.create', resource: 'employees', action: 'create', description: 'Create new employees' },
    { name: 'employees.read', resource: 'employees', action: 'read', description: 'View employees' },
    { name: 'employees.update', resource: 'employees', action: 'update', description: 'Update employees' },
    { name: 'employees.delete', resource: 'employees', action: 'delete', description: 'Delete employees' },

    // Department permissions
    { name: 'departments.create', resource: 'departments', action: 'create', description: 'Create new departments' },
    { name: 'departments.read', resource: 'departments', action: 'read', description: 'View departments' },
    { name: 'departments.update', resource: 'departments', action: 'update', description: 'Update departments' },
    { name: 'departments.delete', resource: 'departments', action: 'delete', description: 'Delete departments' },

    // Designation permissions
    { name: 'designations.create', resource: 'designations', action: 'create', description: 'Create new designations' },
    { name: 'designations.read', resource: 'designations', action: 'read', description: 'View designations' },
    { name: 'designations.update', resource: 'designations', action: 'update', description: 'Update designations' },
    { name: 'designations.delete', resource: 'designations', action: 'delete', description: 'Delete designations' },

    // Payroll permissions
    { name: 'payroll.create', resource: 'payroll', action: 'create', description: 'Create payroll records' },
    { name: 'payroll.read', resource: 'payroll', action: 'read', description: 'View payroll records' },
    { name: 'payroll.update', resource: 'payroll', action: 'update', description: 'Update payroll records' },
    { name: 'payroll.delete', resource: 'payroll', action: 'delete', description: 'Delete payroll records' },
    { name: 'payroll.process', resource: 'payroll', action: 'process', description: 'Process payroll' },

    // Leave permissions
    { name: 'leave.create', resource: 'leave', action: 'create', description: 'Create leave requests' },
    { name: 'leave.read', resource: 'leave', action: 'read', description: 'View leave requests' },
    { name: 'leave.update', resource: 'leave', action: 'update', description: 'Update leave requests' },
    { name: 'leave.delete', resource: 'leave', action: 'delete', description: 'Delete leave requests' },
    { name: 'leave.approve', resource: 'leave', action: 'approve', description: 'Approve leave requests' },

    // Dashboard permissions
    { name: 'dashboard.view', resource: 'dashboard', action: 'view', description: 'View dashboard' },
    { name: 'reports.view', resource: 'reports', action: 'view', description: 'View reports' },
    { name: 'reports.export', resource: 'reports', action: 'export', description: 'Export reports' },

    // Product permissions
    { name: 'products.create', resource: 'products', action: 'create', description: 'Create new products' },
    { name: 'products.read', resource: 'products', action: 'read', description: 'View products' },
    { name: 'products.update', resource: 'products', action: 'update', description: 'Update products' },
    { name: 'products.delete', resource: 'products', action: 'delete', description: 'Delete products' },

    // Project permissions
    { name: 'projects.create', resource: 'projects', action: 'create', description: 'Create new projects' },
    { name: 'projects.read', resource: 'projects', action: 'read', description: 'View projects' },
    { name: 'projects.update', resource: 'projects', action: 'update', description: 'Update projects' },
    { name: 'projects.delete', resource: 'projects', action: 'delete', description: 'Delete projects' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

  console.log(`✅ Created ${permissions.length} permissions`);

  // Create Roles
  console.log('Creating roles...');
  
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'super_admin' },
    update: {},
    create: {
      name: 'super_admin',
      description: 'Super Administrator with full access',
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

  console.log('✅ Created roles');

  // Assign all permissions to super_admin
  console.log('Assigning permissions to super_admin...');
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

  console.log('✅ Assigned all permissions to super_admin');

  // Assign permissions to admin (all except role management)
  console.log('Assigning permissions to admin...');
  const adminPermissions = allPermissions.filter(p => !p.name.startsWith('roles.'));
  
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

  console.log('✅ Assigned permissions to admin');

  // Assign permissions to HR
  console.log('Assigning permissions to hr...');
  const hrPermissions = allPermissions.filter(p =>
    p.name.startsWith('employees.') ||
    p.name.startsWith('leave.') ||
    p.name.startsWith('projects.') ||
    p.name.startsWith('products.') ||
    p.name === 'dashboard.view' ||
    p.name === 'reports.view'
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

  console.log('✅ Assigned permissions to hr');

  // Assign permissions to manager
  console.log('Assigning permissions to manager...');
  const managerPermissions = allPermissions.filter(p =>
    p.name === 'employees.read' ||
    p.name === 'leave.read' ||
    p.name === 'leave.approve' ||
    p.name === 'projects.read' ||
    p.name === 'products.read' ||
    p.name === 'dashboard.view' ||
    p.name === 'reports.view'
  );

  for (const permission of managerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: managerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: managerRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('✅ Assigned permissions to manager');

  // Assign permissions to employee
  console.log('Assigning permissions to employee...');
  const employeePermissions = allPermissions.filter(p =>
    p.name === 'leave.create' ||
    p.name === 'leave.read' ||
    p.name === 'projects.read' ||
    p.name === 'dashboard.view'
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

  console.log('✅ Assigned permissions to employee');

  // Create Departments first (needed for employees)
  console.log('Creating departments...');
  const departments = [
    { name: 'Executive', code: 'EXEC', description: 'Executive leadership and management' },
    { name: 'Product', code: 'PROD', description: 'Product management and strategy' },
    { name: 'Engineering', code: 'ENG', description: 'Software development and engineering' },
    { name: 'Design', code: 'DES', description: 'UI/UX design and creative' },
    { name: 'Quality Assurance', code: 'QA', description: 'Quality assurance and testing' },
    { name: 'Human Resources', code: 'HR', description: 'Human resources and talent management' },
    { name: 'Finance & Accounts', code: 'FIN', description: 'Finance and accounting' },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: dept,
    });
  }

  console.log(`✅ Created ${departments.length} departments`);

  // Create Designations (Job Titles/Roles)
  console.log('Creating designations...');
  const designations = [
    // Executive (Level 10)
    { name: 'Co-Founder', code: 'CO-FOUNDER', description: 'Company co-founder', level: 10 },
    { name: 'CEO', code: 'CEO', description: 'Chief Executive Officer', level: 10 },
    { name: 'VP of Operations', code: 'VP-OPS', description: 'Vice President of Operations', level: 9 },

    // Product (Levels 7-8)
    { name: 'Director of Product', code: 'DIR-PROD', description: 'Director of Product', level: 8 },
    { name: 'Product Owner', code: 'PO', description: 'Product Owner', level: 7 },
    { name: 'Product Manager', code: 'PM', description: 'Product Manager', level: 7 },
    { name: 'Business Analyst', code: 'BA', description: 'Business analyst', level: 5 },

    // Engineering (Levels 3-8)
    { name: 'Director of Engineering', code: 'DIR-ENG', description: 'Director of Engineering', level: 8 },
    { name: 'Team Lead', code: 'TEAM-LEAD', description: 'Engineering team lead', level: 6 },
    { name: 'Associate Team Lead', code: 'ASSOC-TL', description: 'Associate team lead', level: 5 },
    { name: 'Senior Software Engineer', code: 'SR-DEV', description: 'Senior software engineer', level: 4 },
    { name: 'Developer', code: 'DEV', description: 'Software developer', level: 3 },

    // Design (Levels 3-6)
    { name: 'Design Lead', code: 'DESIGN-LEAD', description: 'Design team lead', level: 6 },
    { name: 'Designer', code: 'DESIGNER', description: 'Visual/Graphic designer', level: 3 },
    { name: 'UI/UX Designer', code: 'UIUX', description: 'UI/UX designer', level: 3 },

    // Quality Assurance (Levels 3-4)
    { name: 'Senior QA', code: 'SR-QA', description: 'Senior QA engineer', level: 4 },
    { name: 'QA', code: 'QA-ENG', description: 'QA engineer', level: 3 },

    // Human Resources (Level 3)
    { name: 'HR', code: 'HR-SPEC', description: 'Human resources specialist', level: 3 },

    // Finance & Accounts (Level 3)
    { name: 'Account And Finance Specialist', code: 'ACC-FIN', description: 'Account and finance specialist', level: 3 },
  ];

  for (const designation of designations) {
    await prisma.designation.upsert({
      where: { code: designation.code },
      update: {},
      create: designation,
    });
  }

  console.log(`✅ Created ${designations.length} designations`);

  // Create employees
  console.log('Creating employees...');
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  const defaultPassword = await bcrypt.hash('Employee@123', 10);

  // Get departments
  const execDept = await prisma.department.findUnique({ where: { code: 'EXEC' } });
  const prodDept = await prisma.department.findUnique({ where: { code: 'PROD' } });
  const engDept = await prisma.department.findUnique({ where: { code: 'ENG' } });
  const hrDept = await prisma.department.findUnique({ where: { code: 'HR' } });
  const finDept = await prisma.department.findUnique({ where: { code: 'FIN' } });
  const desDept = await prisma.department.findUnique({ where: { code: 'DES' } });

  // Get designations
  const coFounderDesignation = await prisma.designation.findUnique({ where: { code: 'CO-FOUNDER' } });
  const ceoDesignation = await prisma.designation.findUnique({ where: { code: 'CEO' } });
  const vpOpsDesignation = await prisma.designation.findUnique({ where: { code: 'VP-OPS' } });
  const pmDesignation = await prisma.designation.findUnique({ where: { code: 'PM' } });
  const dirEngDesignation = await prisma.designation.findUnique({ where: { code: 'DIR-ENG' } });
  const dirProdDesignation = await prisma.designation.findUnique({ where: { code: 'DIR-PROD' } });
  const teamLeadDesignation = await prisma.designation.findUnique({ where: { code: 'TEAM-LEAD' } });
  const srDevDesignation = await prisma.designation.findUnique({ where: { code: 'SR-DEV' } });
  const hrDesignation = await prisma.designation.findUnique({ where: { code: 'HR-SPEC' } });
  const accFinDesignation = await prisma.designation.findUnique({ where: { code: 'ACC-FIN' } });
  const designerDesignation = await prisma.designation.findUnique({ where: { code: 'DESIGNER' } });

  // 0. Super Admin account (admin@azularc.com)
  const superAdminEmployee = await prisma.employee.upsert({
    where: { officeEmail: 'admin@azularc.com' },
    update: {},
    create: {
      officeEmail: 'admin@azularc.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      employeeCode: 'EMP-ADMIN',
      joiningDate: new Date('2020-01-01'),
      departmentId: execDept?.id,
      designationId: coFounderDesignation?.id,
      employmentType: 'Full-time',
      isActive: true,
      isEmailVerified: true,
      status: 'active',
    },
  });

  // Assign super_admin role
  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: superAdminEmployee.id, roleId: superAdminRole.id } },
    update: {},
    create: { employeeId: superAdminEmployee.id, roleId: superAdminRole.id },
  });

  console.log('✅ Created Super Admin (admin@azularc.com / Admin@123)');

  // 1. Zahir Palanpur - CEO, Co-founder
  const zahir = await prisma.employee.upsert({
    where: { officeEmail: 'zahir.palanpur@azularc.com' },
    update: {},
    create: {
      officeEmail: 'zahir.palanpur@azularc.com',
      password: hashedPassword,
      firstName: 'Zahir',
      lastName: 'Palanpur',
      employeeCode: 'EMP001',
      joiningDate: new Date('2020-01-01'),
      departmentId: execDept?.id,
      designationId: ceoDesignation?.id,
      employmentType: 'Full-time',
      isActive: true,
      isEmailVerified: true,
      status: 'active',
    },
  });

  // Assign super_admin role to Zahir
  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: zahir.id, roleId: superAdminRole.id } },
    update: {},
    create: { employeeId: zahir.id, roleId: superAdminRole.id },
  });

  console.log('✅ Created Zahir Palanpur - CEO (zahir.palanpur@azularc.com / Admin@123)');

  // 2. Jayme Clemons - VP Operations
  const jayme = await prisma.employee.upsert({
    where: { officeEmail: 'jayme.clemons@azularc.com' },
    update: {},
    create: {
      officeEmail: 'jayme.clemons@azularc.com',
      password: defaultPassword,
      firstName: 'Jayme',
      lastName: 'Clemons',
      employeeCode: 'EMP002',
      joiningDate: new Date('2020-06-01'),
      departmentId: execDept?.id,
      designationId: vpOpsDesignation?.id,
      employmentType: 'Full-time',
      isActive: true,
      status: 'active',
      reportingManager: zahir.id,
    },
  });

  // Assign admin role to Jayme
  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: jayme.id, roleId: adminRole.id } },
    update: {},
    create: { employeeId: jayme.id, roleId: adminRole.id },
  });

  // 3. Shir Avidan - Product Manager
  const shir = await prisma.employee.upsert({
    where: { officeEmail: 'shir.avidan@azularc.com' },
    update: {},
    create: {
      officeEmail: 'shir.avidan@azularc.com',
      password: defaultPassword,
      firstName: 'Shir',
      lastName: 'Avidan',
      employeeCode: 'EMP003',
      joiningDate: new Date('2021-03-15'),
      departmentId: prodDept?.id,
      designationId: pmDesignation?.id,
      employmentType: 'Full-time',
      isActive: true,
      status: 'active',
      reportingManager: jayme.id,
    },
  });

  // Assign manager role to Shir
  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: shir.id, roleId: managerRole.id } },
    update: {},
    create: { employeeId: shir.id, roleId: managerRole.id },
  });

  // 4. Parvaiz Patel - Director of Engineering
  const parvaiz = await prisma.employee.upsert({
    where: { officeEmail: 'parvaiz.patel@azularc.com' },
    update: {},
    create: {
      officeEmail: 'parvaiz.patel@azularc.com',
      password: defaultPassword,
      firstName: 'Parvaiz',
      lastName: 'Patel',
      employeeCode: 'EMP004',
      joiningDate: new Date('2020-02-01'),
      departmentId: engDept?.id,
      designationId: dirEngDesignation?.id,
      employmentType: 'Full-time',
      isActive: true,
      status: 'active',
      reportingManager: zahir.id,
    },
  });

  // Assign admin role to Parvaiz
  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: parvaiz.id, roleId: adminRole.id } },
    update: {},
    create: { employeeId: parvaiz.id, roleId: adminRole.id },
  });

  // 5. Zarrar Palekar - Team Lead
  const zarrar = await prisma.employee.upsert({
    where: { officeEmail: 'zarrar.palekar@azularc.com' },
    update: {},
    create: {
      officeEmail: 'zarrar.palekar@azularc.com',
      password: defaultPassword,
      firstName: 'Zarrar',
      lastName: 'Palekar',
      employeeCode: 'EMP005',
      joiningDate: new Date('2021-08-01'),
      departmentId: engDept?.id,
      designationId: teamLeadDesignation?.id,
      employmentType: 'Full-time',
      isActive: true,
      status: 'active',
      reportingManager: parvaiz.id,
    },
  });

  // Assign manager role to Zarrar
  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: zarrar.id, roleId: managerRole.id } },
    update: {},
    create: { employeeId: zarrar.id, roleId: managerRole.id },
  });

  // 6. Shruti Yadav - Senior Software Engineer
  const shruti = await prisma.employee.upsert({
    where: { officeEmail: 'shruti.yadav@azularc.com' },
    update: {},
    create: {
      officeEmail: 'shruti.yadav@azularc.com',
      password: defaultPassword,
      firstName: 'Shruti',
      lastName: 'Yadav',
      employeeCode: 'EMP006',
      joiningDate: new Date('2022-01-15'),
      departmentId: engDept?.id,
      designationId: srDevDesignation?.id,
      employmentType: 'Full-time',
      isActive: true,
      status: 'active',
      reportingManager: zarrar.id,
    },
  });

  // Assign employee role to Shruti
  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: shruti.id, roleId: employeeRole.id } },
    update: {},
    create: { employeeId: shruti.id, roleId: employeeRole.id },
  });

  // 7. Krupali Parmar - HR
  const krupali = await prisma.employee.upsert({
    where: { officeEmail: 'krupali.parmar@azularc.com' },
    update: {},
    create: {
      officeEmail: 'krupali.parmar@azularc.com',
      password: defaultPassword,
      firstName: 'Krupali',
      lastName: 'Parmar',
      employeeCode: 'EMP007',
      joiningDate: new Date('2021-05-01'),
      departmentId: hrDept?.id,
      designationId: hrDesignation?.id,
      employmentType: 'Full-time',
      isActive: true,
      status: 'active',
      reportingManager: parvaiz.id,
    },
  });

  // Assign hr role to Krupali
  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: krupali.id, roleId: hrRole.id } },
    update: {},
    create: { employeeId: krupali.id, roleId: hrRole.id },
  });

  // 8. Nikita Saldanha - Account And Finance Specialist
  const nikita = await prisma.employee.upsert({
    where: { officeEmail: 'nikita.saldanha@azularc.com' },
    update: {},
    create: {
      officeEmail: 'nikita.saldanha@azularc.com',
      password: defaultPassword,
      firstName: 'Nikita',
      lastName: 'Saldanha',
      employeeCode: 'EMP008',
      joiningDate: new Date('2022-03-01'),
      departmentId: finDept?.id,
      designationId: accFinDesignation?.id,
      employmentType: 'Full-time',
      isActive: true,
      status: 'active',
      reportingManager: parvaiz.id,
    },
  });

  // Assign employee role to Nikita
  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: nikita.id, roleId: employeeRole.id } },
    update: {},
    create: { employeeId: nikita.id, roleId: employeeRole.id },
  });

  // 9. Trevor Roberts - Director of Product
  const trevor = await prisma.employee.upsert({
    where: { officeEmail: 'trevor.roberts@azularc.com' },
    update: {},
    create: {
      officeEmail: 'trevor.roberts@azularc.com',
      password: defaultPassword,
      firstName: 'Trevor',
      lastName: 'Roberts',
      employeeCode: 'EMP009',
      joiningDate: new Date('2021-04-01'),
      departmentId: execDept?.id,
      designationId: dirProdDesignation?.id,
      employmentType: 'Full-time',
      isActive: true,
      status: 'active',
      reportingManager: zahir.id,
    },
  });

  // Assign manager role to Trevor
  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: trevor.id, roleId: managerRole.id } },
    update: {},
    create: { employeeId: trevor.id, roleId: managerRole.id },
  });

  // 10. Sarah Minella - Product Manager
  const sarah = await prisma.employee.upsert({
    where: { officeEmail: 'sarah.minella@azularc.com' },
    update: {},
    create: {
      officeEmail: 'sarah.minella@azularc.com',
      password: defaultPassword,
      firstName: 'Sarah',
      lastName: 'Minella',
      employeeCode: 'EMP010',
      joiningDate: new Date('2022-02-15'),
      departmentId: prodDept?.id,
      designationId: pmDesignation?.id,
      employmentType: 'Full-time',
      isActive: true,
      status: 'active',
      reportingManager: jayme.id,
    },
  });

  // Assign employee role to Sarah
  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: sarah.id, roleId: employeeRole.id } },
    update: {},
    create: { employeeId: sarah.id, roleId: employeeRole.id },
  });

  // 11. Karina Hange - Designer
  const karina = await prisma.employee.upsert({
    where: { officeEmail: 'karina.hange@azularc.com' },
    update: {},
    create: {
      officeEmail: 'karina.hange@azularc.com',
      password: defaultPassword,
      firstName: 'Karina',
      lastName: 'Hange',
      employeeCode: 'EMP011',
      joiningDate: new Date('2022-06-01'),
      departmentId: desDept?.id,
      designationId: designerDesignation?.id,
      employmentType: 'Full-time',
      isActive: true,
      status: 'active',
      reportingManager: trevor.id,
    },
  });

  // Assign employee role to Karina
  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: karina.id, roleId: employeeRole.id } },
    update: {},
    create: { employeeId: karina.id, roleId: employeeRole.id },
  });

  // 12. Bradly Young - Designer
  const bradly = await prisma.employee.upsert({
    where: { officeEmail: 'bradly.young@azularc.com' },
    update: {},
    create: {
      officeEmail: 'bradly.young@azularc.com',
      password: defaultPassword,
      firstName: 'Bradly',
      lastName: 'Young',
      employeeCode: 'EMP012',
      joiningDate: new Date('2022-07-15'),
      departmentId: desDept?.id,
      designationId: designerDesignation?.id,
      employmentType: 'Full-time',
      isActive: true,
      status: 'active',
      reportingManager: trevor.id,
    },
  });

  // Assign employee role to Bradly
  await prisma.employeeRole.upsert({
    where: { employeeId_roleId: { employeeId: bradly.id, roleId: employeeRole.id } },
    update: {},
    create: { employeeId: bradly.id, roleId: employeeRole.id },
  });

  console.log('✅ Created 12 employees with roles and reporting structure');

  // Create Leave Balances for all employees
  console.log('Creating leave balances...');
  const leaveTypes = [
    { type: 'Annual', total: 20 },
    { type: 'Sick', total: 10 },
    { type: 'Casual', total: 12 },
    { type: 'Personal', total: 5 },
    { type: 'WFH', total: 24 },
    { type: 'Compensatory', total: 0 },
  ];

  // Fetch all employees from database
  const allEmployees = await prisma.employee.findMany();

  const leaveBalances = [];
  for (const employee of allEmployees) {
    for (const leaveType of leaveTypes) {
      const usedLeaves = Math.floor(Math.random() * (leaveType.total * 0.3)); // Random used leaves (0-30% of total)
      const balance = await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveType_year: {
            employeeId: employee.id,
            leaveType: leaveType.type,
            year: 2025,
          },
        },
        update: {},
        create: {
          employeeId: employee.id,
          leaveType: leaveType.type,
          totalLeaves: leaveType.total,
          usedLeaves: usedLeaves,
          remainingLeaves: leaveType.total - usedLeaves,
          year: 2025,
        },
      });
      leaveBalances.push(balance);
    }
  }

  console.log(`✅ Created ${leaveBalances.length} leave balance records`);

  // Create some sample leave requests for testing approve/reject functionality
  console.log('Creating sample leave requests...');

  const leaveRequests = [];

  const today = new Date();
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // Pending leave requests (for testing approve/reject)
  // Shruti - pending leaves
  leaveRequests.push(
    await prisma.leave.create({
      data: {
        employeeId: shruti.id,
        leaveType: 'Annual',
        startDate: addDays(today, 5),
        endDate: addDays(today, 7),
        days: 3,
        reason: 'Family vacation',
        status: 'pending',
      },
    }),
    await prisma.leave.create({
      data: {
        employeeId: shruti.id,
        leaveType: 'Sick',
        startDate: addDays(today, 15),
        endDate: addDays(today, 15),
        days: 1,
        reason: 'Medical appointment',
        status: 'pending',
      },
    }),
  );

  // Krupali - pending leave
  leaveRequests.push(
    await prisma.leave.create({
      data: {
        employeeId: krupali.id,
        leaveType: 'Casual',
        startDate: addDays(today, 10),
        endDate: addDays(today, 11),
        days: 2,
        reason: 'Personal work',
        status: 'pending',
      },
    }),
  );

  // Nikita - pending leave
  leaveRequests.push(
    await prisma.leave.create({
      data: {
        employeeId: nikita.id,
        leaveType: 'WFH',
        startDate: addDays(today, 8),
        endDate: addDays(today, 8),
        days: 1,
        reason: 'Home renovation work',
        status: 'pending',
      },
    }),
  );

  // Zarrar - pending leave
  leaveRequests.push(
    await prisma.leave.create({
      data: {
        employeeId: zarrar.id,
        leaveType: 'Annual',
        startDate: addDays(today, 20),
        endDate: addDays(today, 24),
        days: 5,
        reason: 'Wedding anniversary trip',
        status: 'pending',
      },
    }),
  );

  // Approved leave requests (historical data)
  leaveRequests.push(
    await prisma.leave.create({
      data: {
        employeeId: shruti.id,
        leaveType: 'Annual',
        startDate: new Date('2024-12-20'),
        endDate: new Date('2024-12-24'),
        days: 5,
        reason: 'Christmas holidays',
        status: 'approved',
        approvedBy: zarrar.id,
        approvedAt: new Date('2024-12-10'),
      },
    }),
    await prisma.leave.create({
      data: {
        employeeId: krupali.id,
        leaveType: 'Casual',
        startDate: new Date('2024-12-15'),
        endDate: new Date('2024-12-15'),
        days: 1,
        reason: 'Personal errands',
        status: 'approved',
        approvedBy: parvaiz.id,
        approvedAt: new Date('2024-12-12'),
      },
    }),
  );

  // Rejected leave request
  leaveRequests.push(
    await prisma.leave.create({
      data: {
        employeeId: nikita.id,
        leaveType: 'Annual',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-31'),
        days: 7,
        reason: 'Year-end vacation',
        status: 'rejected',
        rejectionReason: 'Critical project deadline during this period',
        approvedBy: parvaiz.id,
        approvedAt: new Date('2024-12-05'),
      },
    }),
  );

  // Future approved leaves
  leaveRequests.push(
    await prisma.leave.create({
      data: {
        employeeId: shir.id,
        leaveType: 'Annual',
        startDate: addDays(today, 12),
        endDate: addDays(today, 14),
        days: 3,
        reason: 'Planned vacation',
        status: 'approved',
        approvedBy: jayme.id,
        approvedAt: new Date(),
      },
    }),
    await prisma.leave.create({
      data: {
        employeeId: zarrar.id,
        leaveType: 'WFH',
        startDate: addDays(today, 3),
        endDate: addDays(today, 3),
        days: 1,
        reason: 'Remote work',
        status: 'approved',
        approvedBy: parvaiz.id,
        approvedAt: new Date(),
      },
    }),
  );

  console.log(`✅ Created ${leaveRequests.length} sample leave requests`);

  // Create Products
  console.log('Creating products...');
  const caseHub = await prisma.product.upsert({
    where: { code: 'CASEHUB' },
    update: {},
    create: {
      name: 'CaseHub',
      code: 'CASEHUB',
      description: 'Case management system for legal and government agencies',
    },
  });

  const dataVault = await prisma.product.upsert({
    where: { code: 'DATAVAULT' },
    update: {},
    create: {
      name: 'DataVault',
      code: 'DATAVAULT',
      description: 'Secure data management and storage platform',
    },
  });

  const hrConnect = await prisma.product.upsert({
    where: { code: 'HRCONNECT' },
    update: {},
    create: {
      name: 'HR Connect',
      code: 'HRCONNECT',
      description: 'Human resources management software',
    },
  });

  console.log('✅ Created 3 products');

  // Create Projects (Clients)
  console.log('Creating projects...');

  // CaseHub projects
  const minnesota = await prisma.project.upsert({
    where: { code: 'CH-MN' },
    update: {},
    create: {
      name: 'Minnesota',
      code: 'CH-MN',
      description: 'CaseHub implementation for State of Minnesota',
      productId: caseHub.id,
      status: 'active',
      startDate: new Date('2024-01-15'),
    },
  });

  const wisconsin = await prisma.project.upsert({
    where: { code: 'CH-WI' },
    update: {},
    create: {
      name: 'Wisconsin',
      code: 'CH-WI',
      description: 'CaseHub implementation for State of Wisconsin',
      productId: caseHub.id,
      status: 'active',
      startDate: new Date('2024-03-01'),
    },
  });

  const michigan = await prisma.project.upsert({
    where: { code: 'CH-MI' },
    update: {},
    create: {
      name: 'Michigan',
      code: 'CH-MI',
      description: 'CaseHub implementation for State of Michigan',
      productId: caseHub.id,
      status: 'planning',
      startDate: new Date('2025-02-01'),
    },
  });

  // DataVault projects
  const acmeCorp = await prisma.project.upsert({
    where: { code: 'DV-ACME' },
    update: {},
    create: {
      name: 'Acme Corporation',
      code: 'DV-ACME',
      description: 'DataVault deployment for Acme Corporation',
      productId: dataVault.id,
      status: 'active',
      startDate: new Date('2024-06-01'),
    },
  });

  const globalTech = await prisma.project.upsert({
    where: { code: 'DV-GT' },
    update: {},
    create: {
      name: 'Global Tech Industries',
      code: 'DV-GT',
      description: 'DataVault enterprise rollout for Global Tech',
      productId: dataVault.id,
      status: 'completed',
      startDate: new Date('2023-01-01'),
      endDate: new Date('2024-06-30'),
    },
  });

  // HR Connect projects
  const sunriseLLC = await prisma.project.upsert({
    where: { code: 'HR-SUN' },
    update: {},
    create: {
      name: 'Sunrise LLC',
      code: 'HR-SUN',
      description: 'HR Connect implementation for Sunrise LLC',
      productId: hrConnect.id,
      status: 'on-hold',
      startDate: new Date('2024-08-01'),
    },
  });

  console.log('✅ Created 6 projects');

  // Add project members
  console.log('Adding project members...');

  // Minnesota project - Zarrar (Team Lead), Shruti (Senior Software Engineer)
  await prisma.projectMember.upsert({
    where: { projectId_employeeId: { projectId: minnesota.id, employeeId: zarrar.id } },
    update: {},
    create: {
      projectId: minnesota.id,
      employeeId: zarrar.id,
      role: 'Team Lead',
      allocation: 80,
    },
  });

  await prisma.projectMember.upsert({
    where: { projectId_employeeId: { projectId: minnesota.id, employeeId: shruti.id } },
    update: {},
    create: {
      projectId: minnesota.id,
      employeeId: shruti.id,
      role: 'Senior Software Engineer',
      allocation: 100,
    },
  });

  // Wisconsin project - Shir (Product Manager), Shruti (Senior Software Engineer)
  await prisma.projectMember.upsert({
    where: { projectId_employeeId: { projectId: wisconsin.id, employeeId: shir.id } },
    update: {},
    create: {
      projectId: wisconsin.id,
      employeeId: shir.id,
      role: 'Product Manager',
      allocation: 100,
    },
  });

  await prisma.projectMember.upsert({
    where: { projectId_employeeId: { projectId: wisconsin.id, employeeId: shruti.id } },
    update: {},
    create: {
      projectId: wisconsin.id,
      employeeId: shruti.id,
      role: 'Senior Software Engineer',
      allocation: 50,
    },
  });

  // Acme Corp project - Zarrar (Team Lead)
  await prisma.projectMember.upsert({
    where: { projectId_employeeId: { projectId: acmeCorp.id, employeeId: zarrar.id } },
    update: {},
    create: {
      projectId: acmeCorp.id,
      employeeId: zarrar.id,
      role: 'Team Lead',
      allocation: 100,
    },
  });

  console.log('✅ Added project members');

  // Seed Holidays
  console.log('Creating holidays...');
  const currentYear = new Date().getFullYear();

  // US Holidays for current year
  const usHolidays = [
    { title: "New Year's Day", date: new Date(`${currentYear}-01-01`), description: "First day of the year" },
    { title: "Martin Luther King Jr. Day", date: new Date(`${currentYear}-01-20`), description: "Honoring Dr. Martin Luther King Jr." },
    { title: "Presidents' Day", date: new Date(`${currentYear}-02-17`), description: "Celebrating U.S. Presidents" },
    { title: "Memorial Day", date: new Date(`${currentYear}-05-26`), description: "Honoring military personnel who died in service" },
    { title: "Independence Day", date: new Date(`${currentYear}-07-04`), description: "U.S. Independence Day" },
    { title: "Labor Day", date: new Date(`${currentYear}-09-01`), description: "Celebrating workers" },
    { title: "Columbus Day", date: new Date(`${currentYear}-10-13`), description: "Commemorating Christopher Columbus" },
    { title: "Veterans Day", date: new Date(`${currentYear}-11-11`), description: "Honoring military veterans" },
    { title: "Thanksgiving Day", date: new Date(`${currentYear}-11-27`), description: "Day of giving thanks" },
    { title: "Christmas Day", date: new Date(`${currentYear}-12-25`), description: "Christmas celebration" },
  ];

  for (const holiday of usHolidays) {
    await prisma.holiday.create({
      data: {
        title: holiday.title,
        description: holiday.description,
        date: holiday.date,
        country: 'us',
        year: currentYear,
        createdById: superAdminEmployee.id,
      },
    });
  }

  // India Holidays for current year
  const indiaHolidays = [
    { title: "Republic Day", date: new Date(`${currentYear}-01-26`), description: "Celebrating the Indian Constitution" },
    { title: "Holi", date: new Date(`${currentYear}-03-14`), description: "Festival of Colors" },
    { title: "Good Friday", date: new Date(`${currentYear}-04-18`), description: "Christian observance" },
    { title: "Eid ul-Fitr", date: new Date(`${currentYear}-03-31`), description: "End of Ramadan" },
    { title: "Independence Day", date: new Date(`${currentYear}-08-15`), description: "Indian Independence Day" },
    { title: "Janmashtami", date: new Date(`${currentYear}-08-26`), description: "Birthday of Lord Krishna" },
    { title: "Gandhi Jayanti", date: new Date(`${currentYear}-10-02`), description: "Birthday of Mahatma Gandhi" },
    { title: "Dussehra", date: new Date(`${currentYear}-10-12`), description: "Victory of good over evil" },
    { title: "Diwali", date: new Date(`${currentYear}-11-01`), description: "Festival of Lights" },
    { title: "Christmas Day", date: new Date(`${currentYear}-12-25`), description: "Christmas celebration" },
  ];

  for (const holiday of indiaHolidays) {
    await prisma.holiday.create({
      data: {
        title: holiday.title,
        description: holiday.description,
        date: holiday.date,
        country: 'india',
        year: currentYear,
        createdById: superAdminEmployee.id,
      },
    });
  }

  console.log('✅ Added holidays');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

