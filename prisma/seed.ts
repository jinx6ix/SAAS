// prisma/seed.ts — TypeScript version
// Updated for multi-tenant SaaS: all records include tenantId = 'tenant_default'
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const TENANT_ID = 'tenant_default';

async function main() {
  console.log('🌱 Seeding database...');

  // ── Ensure tenant_default exists ─────────────────────────────────────────
  await prisma.tenant.upsert({
    where:  { id: TENANT_ID },
    update: {},
    create: {
      id:                 TENANT_ID,
      name:               'Jae Travel Expeditions',
      slug:               'jae-travel',
      email:              'admin@jaetravel.co.ke',
      subscriptionStatus: 'active',
      planId:             'plan_professional',
    },
  });

  // ── Users ────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@jaetravel.co.ke' },
    update: {},
    create: { tenantId: TENANT_ID, name: 'Admin User', email: 'admin@jaetravel.co.ke', password: adminHash, role: 'ADMIN' },
  });

  const empHash = await bcrypt.hash('employee123', 12);
  await prisma.user.upsert({
    where:  { email: 'antony@jaetravel.co.ke' },
    update: {},
    create: { tenantId: TENANT_ID, name: 'Antony Waititu', email: 'antony@jaetravel.co.ke', password: empHash, role: 'EMPLOYEE' },
  });
  await prisma.user.upsert({
    where:  { email: 'dedan@jaetravel.co.ke' },
    update: {},
    create: { tenantId: TENANT_ID, name: 'Dedan Kimathi', email: 'dedan@jaetravel.co.ke', password: empHash, role: 'EMPLOYEE' },
  });

  // ── Destinations ─────────────────────────────────────────────────────────
  const destinations = [
    { id: 'dest-masai-mara', name: 'Masai Mara National Reserve',  country: 'KENYA',    description: 'One of the best places to watch wildlife in Kenya.',             highlights: JSON.stringify(['Big Five','Wildebeest Migration','500+ Bird Species']) },
    { id: 'dest-amboseli',   name: 'Amboseli National Park',        country: 'KENYA',    description: 'Famous for large elephant herds and Mt. Kilimanjaro views.',      highlights: JSON.stringify(['Large Elephant Herds','Mt. Kilimanjaro Views','Maasai Culture']) },
    { id: 'dest-serengeti',  name: 'Serengeti National Park',       country: 'TANZANIA', description: 'World-famous for the annual wildebeest migration.',               highlights: JSON.stringify(['Great Wildebeest Migration','Big Five','Endless Plains']) },
    { id: 'dest-bwindi',     name: 'Bwindi Impenetrable Forest',    country: 'UGANDA',   description: "UNESCO World Heritage Site — half the world's mountain gorillas.", highlights: JSON.stringify(['Gorilla Trekking','UNESCO Heritage','Bird Watching']) },
  ];
  for (const d of destinations) {
    await prisma.destination.upsert({ where: { id: d.id }, update: {}, create: { ...d, tenantId: TENANT_ID } });
  }

  // ── Properties ───────────────────────────────────────────────────────────
  await prisma.property.upsert({ where: { id: 'prop-ashnil'    }, update: {}, create: { tenantId: TENANT_ID, id: 'prop-ashnil',    name: 'Ashnil Mara Camp', type: 'TENTED_CAMP', location: 'Masai Mara', country: 'KENYA', category: 4, email: 'reservations@ashnilhotels.com' } });
  await prisma.property.upsert({ where: { id: 'prop-crocodile' }, update: {}, create: { tenantId: TENANT_ID, id: 'prop-crocodile', name: 'Crocodile Camp',   type: 'CAMP',        location: 'Masai Mara', country: 'KENYA', category: 3 } });
  await prisma.property.upsert({ where: { id: 'prop-leisure'   }, update: {}, create: { tenantId: TENANT_ID, id: 'prop-leisure',   name: 'Leisure Apex',    type: 'LODGE',       location: 'Masai Mara', country: 'KENYA', category: 4 } });

  // ── Vehicles ─────────────────────────────────────────────────────────────
  await prisma.vehicle.upsert({ where: { id: 'veh-jeep-01' }, update: {}, create: { tenantId: TENANT_ID, id: 'veh-jeep-01', name: 'Open-sided Jeep 01', type: 'OPEN_SIDED_JEEP', seats: 7, regPlate: 'KBZ 001X', ratePerDay: 26000, currency: 'KES' } });
  await prisma.vehicle.upsert({ where: { id: 'veh-lc-01'   }, update: {}, create: { tenantId: TENANT_ID, id: 'veh-lc-01',   name: 'Land Cruiser 01',   type: 'LAND_CRUISER',   seats: 7, regPlate: 'KCY 234A', ratePerDay: 35000, currency: 'KES' } });

  // ── Tour: 1-Day Mara ──────────────────────────────────────────────────────
  await prisma.tourPackage.upsert({
    where: { id: 'tour-mara-1day' }, update: {},
    create: { tenantId: TENANT_ID, id: 'tour-mara-1day', title: '01 Day Trip Masai Mara National Reserve', description: 'A full day game drive in the world-famous Masai Mara.', durationDays: 1, durationNights: 0, countries: JSON.stringify(['KENYA']), highlights: JSON.stringify(['Masai Mara National Reserve','Big Five Spotting','Packed Bush Lunch']) },
  });
  await prisma.tourDay.deleteMany({ where: { tourPackageId: 'tour-mara-1day' } });
  await prisma.tourDay.create({
    data: {
      tourPackageId: 'tour-mara-1day', destinationId: 'dest-masai-mara', dayNumber: 1,
      title: 'Masai Mara National Reserve',
      description: 'Early morning transfer from Nairobi to Masai Mara. Full day game drive. Return in afternoon.',
      accommodation: 'No accommodation',
      mealPlan:   JSON.stringify({ breakfast: false, lunch: true, dinner: false, note: 'Packed lunch' }),
      activities: JSON.stringify([
        { time: 'Early Morning', description: 'Transfer by Road, Nairobi to Masai Mara National Reserve' },
        { time: 'Mid Morning',   description: 'Full day Game drive, Masai Mara National Reserve' },
        { time: 'Afternoon',     description: 'Transfer by Road, Masai Mara National Reserve to Nairobi' },
      ]),
    },
  });
  await prisma.rateCard.upsert({
    where: { id: 'rate-mara-1day-low' }, update: {},
    create: { id: 'rate-mara-1day-low', tourPackageId: 'tour-mara-1day', season: 'LOW', validFrom: new Date('2026-01-01'), validTo: new Date('2026-12-31'), basedOn2: 180, basedOn4: 160, basedOn6: 140, basedOn8: 130, basedOn10: 120, basedOn12: 110, markupPercent: 10, currency: 'USD', includes: JSON.stringify(['Transport','Park Entry Fees','Game Drive','Packed Lunch','Taxes/VAT']), excludes: JSON.stringify(['International Flights','Personal Items','Tips (US$10 pp/day)','Visa Fees']) },
  });

  // ── Tour: 3-Day Mara ──────────────────────────────────────────────────────
  await prisma.tourPackage.upsert({
    where: { id: 'tour-mara-3day' }, update: {},
    create: { tenantId: TENANT_ID, id: 'tour-mara-3day', title: '03 Days Masai Mara Safari', description: 'Three days of incredible game viewing in the Masai Mara with luxury camp stay.', durationDays: 3, durationNights: 2, countries: JSON.stringify(['KENYA']), highlights: JSON.stringify(['Masai Mara National Reserve','Big Five','Maasai Village','Luxury Tented Camp']) },
  });
  await prisma.tourDay.deleteMany({ where: { tourPackageId: 'tour-mara-3day' } });
  for (const day of [
    { num: 1, title: 'Nairobi to Masai Mara', accomm: 'Ashnil Mara Camp', meals: JSON.stringify({ breakfast: false, lunch: true,  dinner: true  }), acts: JSON.stringify([{ time: 'Morning',   description: 'Depart Nairobi early morning' },  { time: 'Afternoon', description: 'Check-in and afternoon game drive' }]) },
    { num: 2, title: 'Full Day Masai Mara',   accomm: 'Ashnil Mara Camp', meals: JSON.stringify({ breakfast: true,  lunch: true,  dinner: true  }), acts: JSON.stringify([{ time: 'Morning',   description: 'Early morning game drive' },      { time: 'Afternoon', description: 'Evening game drive. Optional Maasai Village visit' }]) },
    { num: 3, title: 'Masai Mara to Nairobi', accomm: 'No accommodation', meals: JSON.stringify({ breakfast: true,  lunch: true,  dinner: false }), acts: JSON.stringify([{ time: 'Morning',   description: 'Final morning game drive' },      { time: 'Afternoon', description: 'Drive back to Nairobi' }]) },
  ]) {
    await prisma.tourDay.create({ data: { tourPackageId: 'tour-mara-3day', destinationId: 'dest-masai-mara', dayNumber: day.num, title: day.title, accommodation: day.accomm, mealPlan: day.meals, activities: day.acts } });
  }
  await prisma.rateCard.upsert({
    where: { id: 'rate-mara-3day-low' }, update: {},
    create: { id: 'rate-mara-3day-low', tourPackageId: 'tour-mara-3day', season: 'LOW', validFrom: new Date('2026-01-01'), validTo: new Date('2026-12-31'), basedOn2: 950, basedOn4: 850, basedOn6: 780, basedOn8: 720, basedOn10: 680, basedOn12: 650, markupPercent: 10, currency: 'USD', includes: JSON.stringify(['Accommodation Full Board','Transport','Park Entry Fees','Game Drives','All Meals','Taxes/VAT']), excludes: JSON.stringify(['International Flights','Personal Items','Tips','Visa Fees']) },
  });

  // ── Sample Client ─────────────────────────────────────────────────────────
  const client = await prisma.client.upsert({
    where:  { id: 'client-christina' },
    update: {},
    create: { tenantId: TENANT_ID, id: 'client-christina', name: 'Ms. Christina Cosandier', email: 'holiday.nbo4@satguru.com', nationality: 'Swiss', isResident: false, notes: 'Requires wheelchair accessible room/vehicle' },
  });

  // ── Sample Booking ────────────────────────────────────────────────────────
  const booking = await prisma.booking.upsert({
    where:  { bookingRef: 'JTE-2026-001' },
    update: {},
    create: { tenantId: TENANT_ID, bookingRef: 'JTE-2026-001', clientId: client.id, tourPackageId: 'tour-mara-3day', assignedToId: admin.id, status: 'CONFIRMED', startDate: new Date('2026-05-27'), endDate: new Date('2026-05-30'), numAdults: 2, numChildren: 0, isResident: false, totalAmount: 1900, currency: 'USD', paidAmount: 0, specialRequirements: 'Guest requires fully accessible room due to wheelchair use.' },
  });

  // ── Sample Vouchers ───────────────────────────────────────────────────────
  await prisma.voucher.upsert({
    where:  { voucherNo: 'JTE270526' },
    update: {},
    create: { tenantId: TENANT_ID, voucherNo: 'JTE270526', type: 'HOTEL', bookingId: booking.id, propertyId: 'prop-ashnil', createdById: admin.id, roomType: 'Standard Room FullBoard', checkIn: new Date('2026-05-27'), checkOut: new Date('2026-05-30'), numNights: 3, numAdults: 2, numChildren: 0, numTwins: 1, numDoubles: 0, numSingles: 0, numTriples: 0, clientName: 'Ms. Christina Cosandier', remarks: 'Guest requires fully accessible room due to wheelchair use.', issuedDate: new Date('2026-04-07') },
  });
  await prisma.voucher.upsert({
    where:  { voucherNo: 'JTE030426' },
    update: {},
    create: { tenantId: TENANT_ID, voucherNo: 'JTE030426', type: 'VEHICLE', bookingId: booking.id, vehicleId: 'veh-jeep-01', createdById: admin.id, vehicleType: 'OPEN SIDED JEEP', clientName: 'Satguru Travel', numAdults: 1, pickupDate: new Date('2026-04-03'), dropoffDate: new Date('2026-04-03'), pickupLocation: 'Nairobi', route: 'Nairobi → Masai Mara → Nairobi', rateKES: 26000, remarks: 'Open-sided Jeep Mara 3rd April 2026', issuedDate: new Date('2026-01-09') },
  });

  console.log('\n✅ Seeding complete!');
  console.log('   Users: 3 · Destinations: 4 · Properties: 3 · Vehicles: 2');
  console.log('   Tours: 2 · Clients: 1 · Bookings: 1 · Vouchers: 2');
  console.log('\n📋 Login:');
  console.log('   admin@jaetravel.co.ke  / admin123');
  console.log('   antony@jaetravel.co.ke / employee123');
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
