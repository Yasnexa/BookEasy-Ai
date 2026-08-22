import { supabase } from '@/lib/supabase-client';
import type { Business, Service, Staff, Appointment, Profile, WorkingHours, TimeSlot } from '@/lib/types';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function fetchBusinessByOwner(ownerId: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) {
    console.error('[api] fetchBusinessByOwner error:', error.message);
    return null;
  }
  return data as Business | null;
}

export async function fetchBusinessBySlug(slug: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[api] fetchBusinessBySlug error:', error.message);
    return null;
  }
  return data as Business | null;
}

export async function fetchBusinessById(id: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[api] fetchBusinessById error:', error.message);
    return null;
  }
  return data as Business | null;
}

export async function fetchApprovedBusinesses(): Promise<Business[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[api] fetchApprovedBusinesses error:', error.message);
    return [];
  }
  return (data || []) as Business[];
}

export async function fetchServicesByBusiness(businessId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[api] fetchServicesByBusiness error:', error.message);
    return [];
  }
  return (data || []) as Service[];
}

export async function fetchStaffByBusiness(businessId: string): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[api] fetchStaffByBusiness error:', error.message);
    return [];
  }
  return (data || []) as Staff[];
}

export async function fetchAppointmentsByBusiness(businessId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      service:services(name),
      staff:staff(full_name),
      customer:profiles(full_name, email, phone)
    `)
    .eq('business_id', businessId)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[api] fetchAppointmentsByBusiness error:', error.message);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    business_id: row.business_id,
    service_id: row.service_id,
    staff_id: row.staff_id,
    customer_id: row.customer_id,
    customer_name: (row.customer as { full_name?: string } | null)?.full_name || 'Customer unavailable',
    customer_email: (row.customer as { email?: string } | null)?.email || '',
    customer_phone: (row.customer as { phone?: string | null } | null)?.phone || null,
    service_name: (row.service as { name?: string } | null)?.name || 'Service unavailable',
    staff_name: (row.staff as { full_name?: string } | null)?.full_name || 'Staff unavailable',
    start_time: row.start_time,
    end_time: row.end_time,
    duration_minutes: row.duration_minutes,
    price: Number(row.price),
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })) as Appointment[];
}

export async function fetchReviewSummaryByBusiness(
  businessId: string
): Promise<{ average: number; count: number } | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('business_id', businessId);

  if (error) {
    console.error('[api] fetchReviewSummaryByBusiness error:', error.message);
    return null;
  }

  const ratings = (data || [])
    .map((row: { rating: number | null }) => row.rating)
    .filter((rating): rating is number => typeof rating === 'number');

  return {
    average: ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0,
    count: ratings.length,
  };
}

export async function fetchAppointmentsByCustomer(customerId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      service:services(name),
      staff:staff(full_name),
      business:businesses(name)
    `)
    .eq('customer_id', customerId)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[api] fetchAppointmentsByCustomer error:', error.message);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    business_id: row.business_id,
    service_id: row.service_id,
    staff_id: row.staff_id,
    customer_id: row.customer_id,
    customer_name: '',
    customer_email: '',
    customer_phone: null,
    service_name: (row.service as { name?: string } | null)?.name || 'Service unavailable',
    staff_name: (row.staff as { full_name?: string } | null)?.full_name || 'Staff unavailable',
    start_time: row.start_time,
    end_time: row.end_time,
    duration_minutes: row.duration_minutes,
    price: Number(row.price),
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })) as Appointment[];
}

export async function updateProfile(
  userId: string,
  updates: { full_name?: string; phone?: string; avatar_url?: string }
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[api] updateProfile error:', error.message);
    return null;
  }
  return data as Profile | null;
}

export async function updateBusiness(
  businessId: string,
  updates: Partial<Pick<Business, 'name' | 'description' | 'category' | 'address' | 'city' | 'phone' | 'email' | 'logo_url' | 'cover_url' | 'primary_color' | 'secondary_color' | 'accent_color' | 'heading_color' | 'body_color' | 'muted_color' | 'button_text_color' | 'button_hover_bg_color' | 'button_hover_text_color' | 'nav_text_color' | 'card_text_color'>>
): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', businessId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[api] updateBusiness error:', error.message);
    return null;
  }
  return data as Business | null;
}

export async function createBusiness(
  ownerId: string,
  data: {
    name: string;
    description?: string;
    category: string;
    address: string;
    city: string;
    phone: string;
    email?: string;
  }
): Promise<{ data: Business | null; error: string | null }> {
  const baseSlug = slugify(data.name) || 'business';

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const slug = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
    const { data: result, error } = await supabase
      .from('businesses')
      .insert({
        owner_id: ownerId,
        name: data.name,
        slug,
        description: data.description || null,
        category: data.category,
        address: data.address,
        city: data.city,
        phone: data.phone,
        email: data.email || null,
        status: 'approved',
      })
      .select()
      .maybeSingle();

    if (!error) return { data: result as Business | null, error: null };
    if (error.code !== '23505') {
      console.error('[api] createBusiness error:', error.message);
      return { data: null, error: error.message };
    }
  }

  return { data: null, error: 'Unable to create a unique website address.' };
}

export async function createAppointment(data: {
  business_id: string;
  service_id: string;
  staff_id: string | null;
  customer_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  price: number;
  notes?: string;
}): Promise<Appointment | null> {
  const { data: result, error } = await supabase
    .from('appointments')
    .insert({
      business_id: data.business_id,
      service_id: data.service_id,
      staff_id: data.staff_id,
      customer_id: data.customer_id,
      start_time: data.start_time,
      end_time: data.end_time,
      duration_minutes: data.duration_minutes,
      price: data.price,
      status: 'pending',
      notes: data.notes || null,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('[api] createAppointment error:', error.message);
    return null;
  }
  return result as Appointment | null;
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: 'pending' | 'confirmed' | 'rescheduled' | 'cancelled' | 'completed' | 'no_show'
): Promise<boolean> {
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId);

  if (error) {
    console.error('[api] updateAppointmentStatus error:', error.message);
    return false;
  }
  return true;
}

export async function rescheduleAppointment(
  appointmentId: string,
  newStartTime: string,
  newEndTime: string
): Promise<boolean> {
  const { error } = await supabase
    .from('appointments')
    .update({
      start_time: newStartTime,
      end_time: newEndTime,
      status: 'rescheduled',
    })
    .eq('id', appointmentId);

  if (error) {
    console.error('[api] rescheduleAppointment error:', error.message);
    return false;
  }
  return true;
}

export async function createService(
  businessId: string,
  data: {
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
    category?: string;
  }
): Promise<{ data: Service | null; error: string | null }> {
  const { data: result, error } = await supabase
    .from('services')
    .insert({
      business_id: businessId,
      name: data.name,
      description: data.description || null,
      duration_minutes: data.duration_minutes,
      price: data.price,
      category: data.category || null,
      active: true,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('[api] createService error:', error.message);
    return { data: null, error: error.message };
  }
  return { data: result as Service | null, error: null };
}

export async function updateService(
  serviceId: string,
  updates: {
    name?: string;
    description?: string | null;
    duration_minutes?: number;
    price?: number;
    category?: string | null;
    active?: boolean;
  }
): Promise<{ data: Service | null; error: string | null }> {
  const { data: result, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', serviceId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[api] updateService error:', error.message);
    return { data: null, error: error.message };
  }
  return { data: result as Service | null, error: null };
}

export async function deleteService(serviceId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId);

  if (error) {
    console.error('[api] deleteService error:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

/* ── Staff CRUD ─────────────────────────────────────────────────────── */

export async function fetchAllStaffByBusiness(businessId: string): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[api] fetchAllStaffByBusiness error:', error.message);
    return [];
  }
  return (data || []) as Staff[];
}

export async function createStaff(
  businessId: string,
  data: {
    full_name: string;
    email: string;
    phone?: string;
    role_title?: string;
    bio?: string;
  }
): Promise<{ data: Staff | null; error: string | null }> {
  const { data: result, error } = await supabase
    .from('staff')
    .insert({
      business_id: businessId,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || null,
      role_title: data.role_title || 'Staff',
      bio: data.bio || null,
      active: true,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('[api] createStaff error:', error.message);
    return { data: null, error: error.message };
  }
  return { data: result as Staff | null, error: null };
}

export async function updateStaff(
  staffId: string,
  updates: {
    full_name?: string;
    email?: string;
    phone?: string | null;
    role_title?: string;
    bio?: string | null;
    active?: boolean;
  }
): Promise<{ data: Staff | null; error: string | null }> {
  const { data: result, error } = await supabase
    .from('staff')
    .update(updates)
    .eq('id', staffId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[api] updateStaff error:', error.message);
    return { data: null, error: error.message };
  }
  return { data: result as Staff | null, error: null };
}

export async function deleteStaff(staffId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('id', staffId);

  if (error) {
    console.error('[api] deleteStaff error:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

/* ── Working hours CRUD ────────────────────────────────────────────── */

export async function fetchWorkingHours(staffId: string): Promise<WorkingHours[]> {
  const { data, error } = await supabase
    .from('working_hours')
    .select('*')
    .eq('staff_id', staffId)
    .order('day_of_week', { ascending: true });

  if (error) {
    console.error('[api] fetchWorkingHours error:', error.message);
    return [];
  }
  return (data || []) as WorkingHours[];
}

export async function fetchWorkingHoursForStaff(staffIds: string[]): Promise<WorkingHours[]> {
  if (staffIds.length === 0) return [];
  const { data, error } = await supabase
    .from('working_hours')
    .select('*')
    .in('staff_id', staffIds)
    .order('day_of_week', { ascending: true });

  if (error) {
    console.error('[api] fetchWorkingHoursForStaff error:', error.message);
    return [];
  }
  return (data || []) as WorkingHours[];
}

export async function saveWorkingHours(
  staffId: string,
  hours: { day_of_week: number; start_time: string; end_time: string; is_working: boolean }[]
): Promise<{ error: string | null }> {
  // Delete existing hours for this staff member, then insert the new set.
  const { error: delError } = await supabase
    .from('working_hours')
    .delete()
    .eq('staff_id', staffId);

  if (delError) {
    console.error('[api] saveWorkingHours delete error:', delError.message);
    return { error: delError.message };
  }

  if (hours.length === 0) return { error: null };

  const rows = hours.map((h) => ({
    staff_id: staffId,
    day_of_week: h.day_of_week,
    start_time: h.start_time,
    end_time: h.end_time,
    is_working: h.is_working,
  }));

  const { error: insError } = await supabase
    .from('working_hours')
    .insert(rows);

  if (insError) {
    console.error('[api] saveWorkingHours insert error:', insError.message);
    return { error: insError.message };
  }
  return { error: null };
}

/* ── Time slot generation ───────────────────────────────────────────── */

export async function fetchAppointmentsByStaff(
  staffId: string,
  date: Date,
  excludeAppointmentId?: string
): Promise<{ start_time: string; end_time: string; status: string }[]> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  let query = supabase
    .from('appointments')
    .select('start_time, end_time, status')
    .eq('staff_id', staffId)
    .gte('start_time', dayStart.toISOString())
    .lte('start_time', dayEnd.toISOString())
    .neq('status', 'cancelled');

  if (excludeAppointmentId) {
    query = query.neq('id', excludeAppointmentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[api] fetchAppointmentsByStaff error:', error.message);
    return [];
  }
  return (data || []) as { start_time: string; end_time: string; status: string }[];
}

export function generateTimeSlots(
  workingHours: WorkingHours[],
  date: Date,
  serviceDurationMinutes: number,
  existingAppointments: { start_time: string; end_time: string; status: string }[]
): TimeSlot[] {
  const dayOfWeek = date.getDay();
  const dayHours = workingHours.find((h) => h.day_of_week === dayOfWeek && h.is_working);

  if (!dayHours) return [];

  const slots: TimeSlot[] = [];
  const [startH, startM] = dayHours.start_time.split(':').map(Number);
  const [endH, endM] = dayHours.end_time.split(':').map(Number);

  const workStart = new Date(date);
  workStart.setHours(startH, startM, 0, 0);
  const workEnd = new Date(date);
  workEnd.setHours(endH, endM, 0, 0);

  // Convert existing appointments to Date objects for overlap checking
  const bookedRanges = existingAppointments.map((a) => ({
    start: new Date(a.start_time),
    end: new Date(a.end_time),
  }));

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  // Generate slots at 15-minute intervals
  const slotStart = new Date(workStart);
  while (slotStart.getTime() + serviceDurationMinutes * 60000 <= workEnd.getTime()) {
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + serviceDurationMinutes);

    // Skip past slots if the date is today
    if (isToday && slotStart <= now) {
      slotStart.setMinutes(slotStart.getMinutes() + 15);
      continue;
    }

    // Check for overlaps with existing appointments
    const overlaps = bookedRanges.some(
      (b) => slotStart < b.end && slotEnd > b.start
    );

    slots.push({
      start_time: slotStart.toISOString(),
      end_time: slotEnd.toISOString(),
      available: !overlaps,
    });

    slotStart.setMinutes(slotStart.getMinutes() + 15);
  }

  return slots;
}

/* ── Business image uploads ─────────────────────────────────────────── */

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function uploadBusinessImage(
  businessId: string,
  file: File,
  kind: 'logo' | 'cover'
): Promise<{ url: string | null; error: string | null }> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { url: null, error: 'Please upload a JPG, PNG, or WebP image.' };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { url: null, error: 'Image must be 5 MB or smaller.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${businessId}/${kind}-${Date.now()}.${ext}`;

  const { error: upError } = await supabase.storage
    .from('business-media')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (upError) {
    console.error('[api] uploadBusinessImage error:', upError.message);
    return { url: null, error: upError.message };
  }

  const { data } = supabase.storage
    .from('business-media')
    .getPublicUrl(path);

  return { url: data.publicUrl, error: null };
}
