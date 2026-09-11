import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const pakistanOffset = "+05:00";
const GEMINI_MODEL = "gemini-2.5-flash";

type IncomingMessage = { role: "user" | "assistant"; content: string };
type Intent = "browse_businesses" | "book" | "reschedule" | "list_appointments" | "cancel" | "general";
type ParsedRequest = {
  intent: Intent;
  service_query: string | null;
  business_query: string | null;
  staff_query: string | null;
  date: string | null;
  time: string | null;
  appointment_query: string | null;
  confirmation: boolean;
};

// ── Owner-mode types ──────────────────────────────────────────────────
type OwnerIntent =
  | "today_appointments"
  | "tomorrow_appointments"
  | "staff_appointments"
  | "customer_appointments"
  | "revenue"
  | "top_service"
  | "staff_schedule"
  | "service_price"
  | "inactive_staff"
  | "business_info"
  | "general";

type OwnerParsed = {
  intent: OwnerIntent;
  staff_query: string | null;
  customer_query: string | null;
  service_query: string | null;
  period: "today" | "tomorrow" | "this_week" | "this_month" | null;
};

type CatalogBusiness = { id: string; name: string; category: string; city: string; address: string; phone: string; email: string | null; description: string | null };
type CatalogService = { id: string; business_id: string; name: string; description: string | null; duration_minutes: number; price: number; category: string | null; active: boolean };
type CatalogStaff = { id: string; business_id: string; full_name: string; role_title: string; email: string; phone: string | null; active: boolean };
type Slot = { start_time: string; end_time: string; available: boolean };
type BookingProposal = {
  business_id: string;
  business_name: string;
  service_id: string;
  service_name: string;
  duration_minutes: number;
  price: number;
  staff_id: string;
  staff_name: string;
  date: string;
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim();
}

function tokens(value: string): string[] {
  return normalize(value).split(/\s+/).filter((token) => token.length > 1);
}

function scoreMatch(query: string | null, value: string): number {
  if (!query) return 0;
  const normalizedQuery = normalize(query);
  const normalizedValue = normalize(value);
  if (normalizedValue === normalizedQuery) return 100;
  if (normalizedValue.includes(normalizedQuery) || normalizedQuery.includes(normalizedValue)) return 80;
  return tokens(query).reduce((score, token) => score + (normalizedValue.includes(token) ? 10 : 0), 0);
}

function bestMatches<T>(items: T[], query: string | null, label: (item: T) => string): T[] {
  if (!query) return items;
  const scored = items
    .map((item) => ({ item, score: scoreMatch(query, label(item)) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) return [];
  const bestScore = scored[0].score;
  return scored.filter(({ score }) => score === bestScore).map(({ item }) => item);
}

function parsePakistanDate(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00${pakistanOffset}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pakistanDayOfWeek(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function pakistanDateTime(date: string, time: string): Date | null {
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const parsed = new Date(`${date}T${time}:00${pakistanOffset}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatPakistanDate(date: string): string {
  const parsed = parsePakistanDate(date);
  if (!parsed) return date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(parsed);
}

function todayInPakistan(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
}

function tomorrowInPakistan(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(tomorrow);
}

function generateSlots(
  date: string,
  durationMinutes: number,
  hours: { day_of_week: number; start_time: string; end_time: string; is_working: boolean }[],
  appointments: { start_time: string; end_time: string; status: string }[],
): Slot[] {
  const dayHours = hours.find((hour) => hour.day_of_week === pakistanDayOfWeek(date) && hour.is_working);
  if (!dayHours) return [];
  const [startHour, startMinute] = dayHours.start_time.slice(0, 5).split(":").map(Number);
  const [endHour, endMinute] = dayHours.end_time.slice(0, 5).split(":").map(Number);
  const workStart = pakistanDateTime(date, `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`);
  const workEnd = pakistanDateTime(date, `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`);
  if (!workStart || !workEnd) return [];

  const now = new Date();
  const booked = appointments.map((appointment) => ({
    start: new Date(appointment.start_time),
    end: new Date(appointment.end_time),
  }));
  const slots: Slot[] = [];
  for (let cursor = workStart; cursor.getTime() + durationMinutes * 60000 <= workEnd.getTime(); cursor = new Date(cursor.getTime() + 15 * 60000)) {
    const end = new Date(cursor.getTime() + durationMinutes * 60000);
    const overlaps = booked.some((appointment) => cursor < appointment.end && end > appointment.start);
    const available = cursor > now && !overlaps;
    if (available) {
      slots.push({ start_time: cursor.toISOString(), end_time: end.toISOString(), available: true });
    }
  }
  return slots;
}

// ── Gemini call with proper error surfacing ──────────────────────────
async function callGemini(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("The AI assistant is not configured yet. Please ask the admin to set the GEMINI_API_KEY secret.");

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      }),
    },
  );

  if (!geminiResponse.ok) {
    let errorDetail = "";
    try {
      const errorBody = await geminiResponse.json();
      errorDetail = errorBody?.error?.message || JSON.stringify(errorBody);
    } catch {
      errorDetail = await geminiResponse.text().catch(() => "");
    }
    console.error(`[ai-assistant] Gemini API ${geminiResponse.status}: ${errorDetail}`);
    if (geminiResponse.status === 429) {
      throw new Error("The AI service rate limit was reached. Please try again in a moment.");
    }
    if (geminiResponse.status === 400 || geminiResponse.status === 404) {
      throw new Error(`The AI service rejected the request: ${errorDetail || "invalid model or request format"}.`);
    }
    throw new Error(`The AI service returned an error (HTTP ${geminiResponse.status}). ${errorDetail || "Please try again."}`);
  }

  const payload = await geminiResponse.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || text.length === 0) {
    const finishReason = payload?.candidates?.[0]?.finishReason;
    console.error("[ai-assistant] Gemini returned no text. Finish reason:", finishReason, "Payload:", JSON.stringify(payload).slice(0, 500));
    if (finishReason === "SAFETY") throw new Error("The AI service blocked the request for safety reasons. Please rephrase your message.");
    throw new Error("The AI service returned an empty response. Please try again.");
  }
  return text;
}

// ── Customer intent parsing ───────────────────────────────────────────
async function parseCustomerIntent(
  messages: IncomingMessage[],
  catalog: { businesses: CatalogBusiness[]; services: CatalogService[]; staff: CatalogStaff[] },
): Promise<ParsedRequest> {
  const today = todayInPakistan();
  const catalogText = JSON.stringify(catalog);
  const prompt = `You are BookEasy AI, a Pakistani appointment assistant. Understand English, Urdu script, Roman Urdu, and mixed messages. Return only valid JSON matching this shape: {"intent":"browse_businesses|book|reschedule|list_appointments|cancel|general","service_query":string|null,"business_query":string|null,"staff_query":string|null,"date":"YYYY-MM-DD"|null,"time":"HH:mm"|null,"appointment_query":string|null,"confirmation":boolean}.
Today in Pakistan is ${today}. Resolve relative dates such as kal, tomorrow, aaj, this weekend into YYYY-MM-DD. Convert times such as 2 PM, do baje, and 14:00 into 24-hour HH:mm. Use intent book for requests to find, suggest, or book a service; use reschedule when the user wants to change an existing appointment's date/time/staff; use browse_businesses when the user asks to see available salons/businesses; use list_appointments for asking about existing bookings; use cancel for cancel requests. Never invent IDs or values. confirmation is true only if the user clearly confirms a previously presented booking.
Business/service/staff catalog: ${catalogText}
Conversation: ${JSON.stringify(messages.slice(-12))}`;

  const text = await callGemini(prompt);
  let parsed: Partial<ParsedRequest>;
  try {
    parsed = JSON.parse(text) as Partial<ParsedRequest>;
  } catch {
    console.error("[ai-assistant] Gemini returned non-JSON:", text.slice(0, 300));
    throw new Error("The AI service returned an unparseable response. Please try again.");
  }
  return {
    intent: parsed.intent && ["browse_businesses", "book", "reschedule", "list_appointments", "cancel", "general"].includes(parsed.intent) ? parsed.intent : "general",
    service_query: typeof parsed.service_query === "string" ? parsed.service_query : null,
    business_query: typeof parsed.business_query === "string" ? parsed.business_query : null,
    staff_query: typeof parsed.staff_query === "string" ? parsed.staff_query : null,
    date: typeof parsed.date === "string" ? parsed.date : null,
    time: typeof parsed.time === "string" ? parsed.time : null,
    appointment_query: typeof parsed.appointment_query === "string" ? parsed.appointment_query : null,
    confirmation: parsed.confirmation === true,
  };
}

// ── Owner intent parsing ──────────────────────────────────────────────
async function parseOwnerIntent(
  messages: IncomingMessage[],
  businessName: string,
  staffNames: string[],
  serviceNames: string[],
): Promise<OwnerParsed> {
  const today = todayInPakistan();
  const prompt = `You are BookEasy AI for business owners. Understand English, Urdu script, Roman Urdu, and mixed messages. Return only valid JSON matching this shape: {"intent":"today_appointments|tomorrow_appointments|staff_appointments|customer_appointments|revenue|top_service|staff_schedule|service_price|inactive_staff|business_info|general","staff_query":string|null,"customer_query":string|null,"service_query":string|null,"period":"today|tomorrow|this_week|this_month"|null}.
Today in Pakistan is ${today}. Map "aaj ki appointments" to today_appointments, "kal kitni bookings" to tomorrow_appointments, "Tayyab ki appointments" to staff_appointments (set staff_query), "customer X ki booking" to customer_appointments (set customer_query), "revenue" to revenue (set period), "sabse zyada booked service" to top_service, "staff schedule" to staff_schedule, "facial ki price" to service_price (set service_query), "inactive staff" to inactive_staff, "business info/profile" to business_info. Never invent values.
Business: ${businessName}. Staff: ${JSON.stringify(staffNames)}. Services: ${JSON.stringify(serviceNames)}.
Conversation: ${JSON.stringify(messages.slice(-8))}`;

  const text = await callGemini(prompt);
  let parsed: Partial<OwnerParsed>;
  try {
    parsed = JSON.parse(text) as Partial<OwnerParsed>;
  } catch {
    console.error("[ai-assistant] Owner Gemini returned non-JSON:", text.slice(0, 300));
    throw new Error("The AI service returned an unparseable response. Please try again.");
  }
  return {
    intent: (parsed.intent as OwnerIntent) || "general",
    staff_query: typeof parsed.staff_query === "string" ? parsed.staff_query : null,
    customer_query: typeof parsed.customer_query === "string" ? parsed.customer_query : null,
    service_query: typeof parsed.service_query === "string" ? parsed.service_query : null,
    period: parsed.period === "today" || parsed.period === "tomorrow" || parsed.period === "this_week" || parsed.period === "this_month" ? parsed.period : null,
  };
}

function businessListText(businesses: CatalogBusiness[]): string {
  if (businesses.length === 0) return "Abhi koi approved business available nahi hai. Please baad mein check karein.";
  return `Yeh available businesses hain:\n\n${businesses.map((business) => `• **${business.name}** — ${business.category}, ${business.city}`).join("\n")}\n\nAap kis business mein booking karwana chahte hain?`;
}

// ── Customer handler ─────────────────────────────────────────────────
async function handleCustomerRequest(
  supabase: ReturnType<typeof createClient>,
  user: { id: string },
  messages: IncomingMessage[],
  body: { confirm_booking?: BookingProposal & { start_time: string; end_time: string } },
): Promise<Response> {
  const [{ data: businesses, error: businessError }, { data: services, error: serviceError }, { data: staff, error: staffError }] = await Promise.all([
    supabase.from("businesses").select("id,name,category,city,address,phone,email,description").eq("status", "approved").order("created_at", { ascending: false }),
    supabase.from("services").select("id,business_id,name,description,duration_minutes,price,category,active").eq("active", true),
    supabase.from("staff").select("id,business_id,full_name,role_title").eq("active", true),
  ]);
  if (businessError || serviceError || staffError) return response({ error: "I couldn't load the available booking options. Please try again." }, 500);

  const catalog = {
    businesses: (businesses || []) as CatalogBusiness[],
    services: ((services || []) as Record<string, unknown>[]).map((service) => ({ ...service, price: Number(service.price) })) as CatalogService[],
    staff: (staff || []) as CatalogStaff[],
  };

  // ── Confirm booking ──────────────────────────────────────────────────
  if (body.confirm_booking) {
    const proposal = body.confirm_booking;
    const selectedBusiness = catalog.businesses.find((business) => business.id === proposal.business_id);
    const selectedService = catalog.services.find((service) => service.id === proposal.service_id && service.business_id === proposal.business_id);
    const selectedStaff = catalog.staff.find((member) => member.id === proposal.staff_id && member.business_id === proposal.business_id);
    const parsedDate = parsePakistanDate(proposal.date);
    if (!selectedBusiness || !selectedService || !selectedStaff || !parsedDate) {
      return response({ error: "That booking option is no longer available. Please ask me to check the slots again." }, 400);
    }

    const { data: hours, error: hoursError } = await supabase.from("working_hours").select("day_of_week,start_time,end_time,is_working").eq("staff_id", selectedStaff.id);
    const { data: appointments, error: appointmentsError } = await supabase.from("appointments").select("start_time,end_time,status").eq("staff_id", selectedStaff.id).gte("start_time", `${proposal.date}T00:00:00${pakistanOffset}`).lt("start_time", `${proposal.date}T23:59:59${pakistanOffset}`).neq("status", "cancelled");
    if (hoursError || appointmentsError) return response({ error: "I couldn't re-check that slot right now." }, 500);
    const availableSlots = generateSlots(proposal.date, selectedService.duration_minutes, hours || [], appointments || []);
    const selectedSlot = availableSlots.find((slot) => slot.start_time === proposal.start_time && slot.end_time === proposal.end_time);
    if (!selectedSlot) return response({ error: "That slot was just taken or is no longer available. Please choose another slot." }, 409);

    const { data: appointment, error: bookingError } = await supabase.from("appointments").insert({
      business_id: selectedBusiness.id,
      service_id: selectedService.id,
      staff_id: selectedStaff.id,
      customer_id: user.id,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      duration_minutes: selectedService.duration_minutes,
      price: selectedService.price,
      status: "pending",
    }).select("id").maybeSingle();
    if (bookingError || !appointment) {
      if (bookingError?.code === "23P01") return response({ error: "That slot was just taken. Please choose another available time." }, 409);
      return response({ error: "I couldn't save the appointment. Please try again." }, 500);
    }
    return response({ message: `Appointment confirmed successfully. Your **${selectedService.name}** at **${selectedBusiness.name}** with **${selectedStaff.full_name}** is booked for ${formatPakistanDate(proposal.date)} at ${formatTime(selectedSlot.start_time)}.`, appointment_id: appointment.id });
  }

  const parsed = await parseCustomerIntent(messages, catalog);

  if (parsed.intent === "browse_businesses") return response({ message: businessListText(catalog.businesses) });

  if (parsed.intent === "list_appointments") {
    const { data: appointments, error } = await supabase.from("appointments").select("id,start_time,end_time,status,price,businesses(name),services(name),staff(full_name)").eq("customer_id", user.id).neq("status", "cancelled").order("start_time", { ascending: true });
    if (error) return response({ error: "I couldn't load your appointments right now." }, 500);
    if (!appointments || appointments.length === 0) return response({ message: "Aap ki koi active appointment nahi mili." });
    const message = `Aap ki appointments:\n\n${appointments.map((appointment: Record<string, unknown>) => {
      const business = appointment.businesses as { name?: string } | null;
      const service = appointment.services as { name?: string } | null;
      const staffMember = appointment.staff as { full_name?: string } | null;
      return `• ${service?.name || "Service"} at ${business?.name || "Business"} — ${formatPakistanDate(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date(String(appointment.start_time))))}, ${formatTime(String(appointment.start_time))} with ${staffMember?.full_name || "staff"} (${String(appointment.status)})`;
    }).join("\n")}`;
    return response({ message });
  }

  if (parsed.intent === "cancel") {
    const { data: appointments, error } = await supabase.from("appointments").select("id,start_time,status,businesses(name),services(name)").eq("customer_id", user.id).in("status", ["pending", "confirmed", "rescheduled"]).gte("start_time", new Date().toISOString()).order("start_time", { ascending: true });
    if (error) return response({ error: "I couldn't load your appointments to cancel one." }, 500);
    const matches = (appointments || []).filter((appointment: Record<string, unknown>) => {
      const business = appointment.businesses as { name?: string } | null;
      const service = appointment.services as { name?: string } | null;
      return !parsed.appointment_query || scoreMatch(parsed.appointment_query, `${business?.name || ""} ${service?.name || ""}`) > 0;
    });
    if (matches.length !== 1) {
      if (matches.length === 0) return response({ message: "Mujhe aap ki matching upcoming appointment nahi mili." });
      return response({ message: `Aap in mein se kis appointment ko cancel karna chahte hain?\n\n${matches.map((appointment: Record<string, unknown>) => `• ${String((appointment.services as { name?: string } | null)?.name || "Service")} — ${formatPakistanDate(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date(String(appointment.start_time))))}, ${formatTime(String(appointment.start_time))}`).join("\n")}` });
    }
    const appointment = matches[0] as { id: string; start_time: string; businesses: { name?: string } | null; services: { name?: string } | null };
    const { error: cancelError } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", appointment.id).eq("customer_id", user.id);
    if (cancelError) return response({ error: "I couldn't cancel that appointment. Please try again." }, 500);
    return response({ message: `Done — your ${appointment.services?.name || "appointment"} at ${appointment.businesses?.name || "the business"} has been cancelled successfully.` });
  }

  // ── Reschedule: find existing appointment, update it (no duplicate) ───
  if (parsed.intent === "reschedule") {
    const { data: appointments, error } = await supabase.from("appointments").select("id,start_time,end_time,status,businesses(name),services(name),staff(full_name),staff_id,service_id,duration_minutes").eq("customer_id", user.id).in("status", ["pending", "confirmed", "rescheduled"]).gte("start_time", new Date().toISOString()).order("start_time", { ascending: true });
    if (error) return response({ error: "I couldn't load your appointments to reschedule." }, 500);
    const matches = (appointments || []).filter((appointment: Record<string, unknown>) => {
      const business = appointment.businesses as { name?: string } | null;
      const service = appointment.services as { name?: string } | null;
      return !parsed.appointment_query || scoreMatch(parsed.appointment_query, `${business?.name || ""} ${service?.name || ""}`) > 0;
    });
    if (matches.length === 0) return response({ message: "Mujhe aap ki koi reschedule karne layak upcoming appointment nahi mili." });
    if (matches.length > 1) {
      return response({ message: `Aap kis appointment ko reschedule karna chahte hain?\n\n${matches.map((appointment: Record<string, unknown>) => `• ${String((appointment.services as { name?: string } | null)?.name || "Service")} — ${formatPakistanDate(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date(String(appointment.start_time))))}, ${formatTime(String(appointment.start_time))}`).join("\n")}` });
    }
    const appointment = matches[0] as {
      id: string; start_time: string; end_time: string; staff_id: string; service_id: string;
      duration_minutes: number; businesses: { name?: string } | null; services: { name?: string } | null;
      staff: { full_name?: string } | null;
    };

    if (!parsed.date) return response({ message: `Aap **${appointment.services?.name || "appointment"}** at **${appointment.businesses?.name || "business"}** ko reschedule karna chahte hain. Nayi date bata dein.` });

    const { data: hours, error: hoursError } = await supabase.from("working_hours").select("day_of_week,start_time,end_time,is_working").eq("staff_id", appointment.staff_id);
    const { data: existingAppts, error: apptsError } = await supabase.from("appointments").select("start_time,end_time,status").eq("staff_id", appointment.staff_id).gte("start_time", `${parsed.date}T00:00:00${pakistanOffset}`).lt("start_time", `${parsed.date}T23:59:59${pakistanOffset}`).neq("status", "cancelled").neq("id", appointment.id);
    if (hoursError || apptsError) return response({ error: "I couldn't check availability for rescheduling." }, 500);
    const slots = generateSlots(parsed.date, appointment.duration_minutes, hours || [], existingAppts || []);
    if (slots.length === 0) return response({ message: `**${appointment.staff?.full_name || "Staff"}** ke liye ${formatPakistanDate(parsed.date)} ko koi available slot nahi mila. Kya aap doosri date try karna chahte hain?` });

    const requestedSlot = parsed.time ? slots.find((slot) => Math.abs(new Date(slot.start_time).getTime() - (pakistanDateTime(parsed.date!, parsed.time!)?.getTime() || 0)) < 60000) : null;
    const proposal: BookingProposal = {
      business_id: (appointment as Record<string, unknown>).business_id as string,
      business_name: appointment.businesses?.name || "Business",
      service_id: appointment.service_id,
      service_name: appointment.services?.name || "Service",
      duration_minutes: appointment.duration_minutes,
      price: 0,
      staff_id: appointment.staff_id,
      staff_name: appointment.staff?.full_name || "Staff",
      date: parsed.date,
    };
    if (parsed.time && !requestedSlot) {
      return response({ message: `${formatTime(pakistanDateTime(parsed.date, parsed.time)?.toISOString() || new Date().toISOString())} available nahi hai. Yeh available slots hain:`, suggested_slots: slots.slice(0, 12), booking_proposal: proposal, pending_action: "reschedule" });
    }
    if (requestedSlot) {
      // Re-check availability then update the existing appointment
      const { error: updateError } = await supabase.from("appointments").update({
        start_time: requestedSlot.start_time,
        end_time: requestedSlot.end_time,
        status: "rescheduled",
      }).eq("id", appointment.id).eq("customer_id", user.id);
      if (updateError) {
        if (updateError.code === "23P01") return response({ error: "That slot was just taken. Please choose another available time." }, 409);
        return response({ error: "I couldn't reschedule that appointment. Please try again." }, 500);
      }
      return response({ message: `Done — your **${appointment.services?.name || "appointment"}** has been rescheduled to ${formatPakistanDate(parsed.date)} at ${formatTime(requestedSlot.start_time)} with **${appointment.staff?.full_name || "staff"}**.` });
    }
    return response({ message: `${formatPakistanDate(parsed.date)} ke available slots yeh hain:`, suggested_slots: slots.slice(0, 12), booking_proposal: proposal, pending_action: "reschedule" });
  }

  if (parsed.intent !== "book") return response({ message: "Bilkul, main aap ki appointment mein madad kar sakta hoon. Service, business, date ya time bata dein." });

  // ── Book flow ────────────────────────────────────────────────────────
  const matchingBusinesses = bestMatches(catalog.businesses, parsed.business_query, (business) => `${business.name} ${business.category} ${business.city}`);
  const availableBusinesses = matchingBusinesses.length > 0 ? matchingBusinesses : catalog.businesses;
  const matchingServices = catalog.services.filter((service) => availableBusinesses.some((business) => business.id === service.business_id));
  const serviceMatches = bestMatches(matchingServices, parsed.service_query, (service) => `${service.name} ${service.description || ""}`);
  if (serviceMatches.length === 0) {
    return response({ message: "Mujhe matching service nahi mili. Aap service ka naam bata dein, jaise haircut ya beard trim." });
  }
  if (serviceMatches.length > 1 && !parsed.business_query) {
    return response({ message: `Yeh service in businesses mein available hai:\n\n${serviceMatches.map((service) => `• ${service.name} — ${catalog.businesses.find((business) => business.id === service.business_id)?.name || "Business"}`).join("\n")}\n\nAap kis business ko choose karna chahte hain?` });
  }

  const selectedService = serviceMatches[0];
  const selectedBusiness = catalog.businesses.find((business) => business.id === selectedService.business_id);
  if (!selectedBusiness) return response({ message: "Is service ka business ab available nahi hai." });
  const businessStaff = catalog.staff.filter((member) => member.business_id === selectedBusiness.id);

  const staffMatches = bestMatches(businessStaff, parsed.staff_query, (member) => `${member.full_name} ${member.role_title}`);
  if (staffMatches.length === 0) return response({ message: `**${selectedBusiness.name}** mein is waqt koi active staff available nahi hai.` });
  if (staffMatches.length > 1 && !parsed.staff_query) {
    return response({ message: `**${selectedService.name}** ke liye staff choose karein:\n\n${staffMatches.map((member) => `• ${member.full_name} — ${member.role_title}`).join("\n")}` });
  }
  const selectedStaff = staffMatches[0];
  if (!parsed.date) return response({ message: `Bilkul — **${selectedService.name}** at **${selectedBusiness.name}** with **${selectedStaff.full_name}**. Aap kis date ko booking chahte hain?` });
  if (!parsePakistanDate(parsed.date)) return response({ message: "Date samajh nahi aayi. Please kal, tomorrow, ya exact date bata dein." });

  const { data: hours, error: hoursError } = await supabase.from("working_hours").select("day_of_week,start_time,end_time,is_working").eq("staff_id", selectedStaff.id);
  const { data: appointments, error: appointmentsError } = await supabase.from("appointments").select("start_time,end_time,status").eq("staff_id", selectedStaff.id).gte("start_time", `${parsed.date}T00:00:00${pakistanOffset}`).lt("start_time", `${parsed.date}T23:59:59${pakistanOffset}`).neq("status", "cancelled");
  if (hoursError || appointmentsError) return response({ error: "I couldn't check availability right now." }, 500);
  const slots = generateSlots(parsed.date, selectedService.duration_minutes, hours || [], appointments || []);
  if (slots.length === 0) return response({ message: `**${selectedStaff.full_name}** ke liye ${formatPakistanDate(parsed.date)} ko koi available slot nahi mila. Kya aap doosri date try karna chahte hain?` });

  const requestedSlot = parsed.time ? slots.find((slot) => Math.abs(new Date(slot.start_time).getTime() - (pakistanDateTime(parsed.date!, parsed.time!)?.getTime() || 0)) < 60000) : null;
  const proposal: BookingProposal = {
    business_id: selectedBusiness.id,
    business_name: selectedBusiness.name,
    service_id: selectedService.id,
    service_name: selectedService.name,
    duration_minutes: selectedService.duration_minutes,
    price: selectedService.price,
    staff_id: selectedStaff.id,
    staff_name: selectedStaff.full_name,
    date: parsed.date,
  };
  if (parsed.time && !requestedSlot) {
    return response({ message: `${formatTime(pakistanDateTime(parsed.date, parsed.time)?.toISOString() || new Date().toISOString())} available nahi hai. Yeh available slots hain:`, suggested_slots: slots.slice(0, 12), booking_proposal: proposal });
  }
  if (requestedSlot) {
    return response({ message: `**${formatTime(requestedSlot.start_time)}** available hai. **${selectedService.name}** at **${selectedBusiness.name}** with **${selectedStaff.full_name}** — kya main confirm kar doon?`, suggested_slots: [requestedSlot], booking_proposal: proposal, pending_action: "confirm" });
  }
  return response({ message: `${formatPakistanDate(parsed.date)} ke available slots yeh hain:`, suggested_slots: slots.slice(0, 12), booking_proposal: proposal, pending_action: "book" });
}

// ── Owner handler ────────────────────────────────────────────────────
async function handleOwnerRequest(
  supabase: ReturnType<typeof createClient>,
  user: { id: string },
  messages: IncomingMessage[],
): Promise<Response> {
  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("id,name,category,city,address,phone,email,description")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (bizError || !business) return response({ error: "Aap ka business profile nahi mila. Pehle business setup karein." }, 404);
  const businessId = (business as Record<string, unknown>).id as string;

  const [staffResult, servicesResult] = await Promise.all([
    supabase.from("staff").select("id,full_name,role_title,email,phone,active").eq("business_id", businessId).order("created_at", { ascending: true }),
    supabase.from("services").select("id,name,price,duration_minutes,category,active").eq("business_id", businessId).order("created_at", { ascending: true }),
  ]);
  const allStaff = (staffResult.data || []) as CatalogStaff[];
  const allServices = (servicesResult.data || []) as CatalogService[];

  const parsed = await parseOwnerIntent(
    messages,
    (business as Record<string, unknown>).name as string,
    allStaff.map((s) => s.full_name),
    allServices.map((s) => s.name),
  );

  const today = todayInPakistan();
  const tomorrow = tomorrowInPakistan();

  if (parsed.intent === "today_appointments" || parsed.intent === "tomorrow_appointments") {
    const targetDate = parsed.intent === "today_appointments" ? today : tomorrow;
    const { data: appts, error } = await supabase
      .from("appointments")
      .select("id,start_time,end_time,status,price,services(name),staff(full_name),customer_id")
      .eq("business_id", businessId)
      .gte("start_time", `${targetDate}T00:00:00${pakistanOffset}`)
      .lt("start_time", `${targetDate}T23:59:59${pakistanOffset}`)
      .neq("status", "cancelled")
      .order("start_time", { ascending: true });
    if (error) return response({ error: "Appointments load nahi ho sakin." });
    if (!appts || appts.length === 0) return response({ message: `${formatPakistanDate(targetDate)} ko koi appointments nahi hain.` });
    const message = `${formatPakistanDate(targetDate)} ki appointments:\n\n${appts.map((a: Record<string, unknown>) => {
      const service = a.services as { name?: string } | null;
      const staffMember = a.staff as { full_name?: string } | null;
      return `• ${service?.name || "Service"} — ${formatTime(String(a.start_time))} to ${formatTime(String(a.end_time))} with ${staffMember?.full_name || "staff"} (${String(a.status)}) — $${Number(a.price).toFixed(2)}`;
    }).join("\n")}`;
    return response({ message });
  }

  if (parsed.intent === "staff_appointments") {
    const staffMatches = bestMatches(allStaff, parsed.staff_query, (s) => `${s.full_name} ${s.role_title}`);
    if (staffMatches.length === 0) return response({ message: "Matching staff nahi mila." });
    const staffMember = staffMatches[0];
    const { data: appts, error } = await supabase
      .from("appointments")
      .select("id,start_time,end_time,status,services(name)")
      .eq("staff_id", staffMember.id)
      .neq("status", "cancelled")
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(20);
    if (error) return response({ error: "Staff appointments load nahi hui." });
    if (!appts || appts.length === 0) return response({ message: `**${staffMember.full_name}** ki koi upcoming appointments nahi hain.` });
    const message = `**${staffMember.full_name}** ki appointments:\n\n${appts.map((a: Record<string, unknown>) => {
      const service = a.services as { name?: string } | null;
      return `• ${service?.name || "Service"} — ${formatPakistanDate(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date(String(a.start_time))))}, ${formatTime(String(a.start_time))} (${String(a.status)})`;
    }).join("\n")}`;
    return response({ message });
  }

  if (parsed.intent === "customer_appointments") {
    const { data: profiles, error: profError } = await supabase
      .from("profiles")
      .select("id,full_name,email")
      .ilike("full_name", `%${parsed.customer_query || ""}%`)
      .limit(5);
    if (profError || !profiles || profiles.length === 0) return response({ message: "Matching customer nahi mila." });
    const customerIds = profiles.map((p: Record<string, unknown>) => p.id as string);
    const { data: appts, error } = await supabase
      .from("appointments")
      .select("id,start_time,end_time,status,services(name),staff(full_name),customer_id")
      .eq("business_id", businessId)
      .in("customer_id", customerIds)
      .neq("status", "cancelled")
      .order("start_time", { ascending: true })
      .limit(20);
    if (error) return response({ error: "Customer appointments load nahi hui." });
    if (!appts || appts.length === 0) return response({ message: "Is customer ki koi appointments nahi mili." });
    const nameMap = new Map(profiles.map((p: Record<string, unknown>) => [p.id as string, p.full_name as string]));
    const message = `Customer appointments:\n\n${appts.map((a: Record<string, unknown>) => {
      const service = a.services as { name?: string } | null;
      const staffMember = a.staff as { full_name?: string } | null;
      return `• ${nameMap.get(a.customer_id as string) || "Customer"} — ${service?.name || "Service"}, ${formatPakistanDate(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date(String(a.start_time))))} at ${formatTime(String(a.start_time))} (${String(a.status)})`;
    }).join("\n")}`;
    return response({ message });
  }

  if (parsed.intent === "revenue") {
    let startDate: string;
    const now = new Date();
    if (parsed.period === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else if (parsed.period === "this_week") {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      startDate = weekStart.toISOString();
    } else if (parsed.period === "tomorrow") {
      startDate = `${tomorrow}T00:00:00${pakistanOffset}`;
    } else {
      startDate = `${today}T00:00:00${pakistanOffset}`;
    }
    const { data: appts, error } = await supabase
      .from("appointments")
      .select("price,status")
      .eq("business_id", businessId)
      .gte("start_time", startDate)
      .neq("status", "cancelled");
    if (error) return response({ error: "Revenue calculate nahi ho saka." });
    const total = (appts || []).reduce((sum: number, a: Record<string, unknown>) => sum + Number(a.price), 0);
    const count = appts?.length || 0;
    const label = parsed.period === "this_month" ? "this month" : parsed.period === "this_week" ? "this week" : parsed.period === "tomorrow" ? "tomorrow" : "today";
    return response({ message: `${label} ka revenue: **$${total.toFixed(2)}** (${count} appointments).` });
  }

  if (parsed.intent === "top_service") {
    const { data: appts, error } = await supabase
      .from("appointments")
      .select("service_id,services(name)")
      .eq("business_id", businessId)
      .neq("status", "cancelled")
      .gte("start_time", new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1).toISOString());
    if (error) return response({ error: "Service stats load nahi hui." });
    const counts = new Map<string, { name: string; count: number }>();
    for (const a of (appts || []) as Record<string, unknown>[]) {
      const service = a.services as { name?: string } | null;
      const sid = a.service_id as string;
      const existing = counts.get(sid) || { name: service?.name || "Service", count: 0 };
      existing.count++;
      counts.set(sid, existing);
    }
    if (counts.size === 0) return response({ message: "Abhi koi booking data nahi hai." });
    const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
    const message = `Sabse zyada booked services:\n\n${sorted.slice(0, 5).map((s, i) => `${i + 1}. **${s.name}** — ${s.count} bookings`).join("\n")}`;
    return response({ message });
  }

  if (parsed.intent === "staff_schedule") {
    const staffId = parsed.staff_query ? bestMatches(allStaff, parsed.staff_query, (s) => s.full_name)[0]?.id : null;
    const targetStaff = staffId ? allStaff.filter((s) => s.id === staffId) : allStaff;
    if (targetStaff.length === 0) return response({ message: "Koi staff nahi mila." });
    const staffIds = targetStaff.map((s) => s.id);
    const { data: hours, error } = await supabase
      .from("working_hours")
      .select("staff_id,day_of_week,start_time,end_time,is_working")
      .in("staff_id", staffIds)
      .order("day_of_week", { ascending: true });
    if (error) return response({ error: "Staff schedule load nahi hua." });
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const message = `Staff schedule:\n\n${targetStaff.map((s) => {
      const staffHours = (hours || []).filter((h: Record<string, unknown>) => h.staff_id === s.id);
      if (staffHours.length === 0) return `• **${s.full_name}** — No schedule set`;
      const days = staffHours.map((h: Record<string, unknown>) => `${dayNames[h.day_of_week as number]} ${h.is_working ? `${String(h.start_time).slice(0, 5)}-${String(h.end_time).slice(0, 5)}` : "(off)"}`).join(", ");
      return `• **${s.full_name}** — ${days}`;
    }).join("\n")}`;
    return response({ message });
  }

  if (parsed.intent === "service_price") {
    const serviceMatches = bestMatches(allServices, parsed.service_query, (s) => s.name);
    if (serviceMatches.length === 0) return response({ message: "Matching service nahi mila." });
    const s = serviceMatches[0];
    return response({ message: `**${s.name}** ki current price: **$${Number(s.price).toFixed(2)}** (${s.duration_minutes} min). ${s.active ? "Active" : "Inactive"}.` });
  }

  if (parsed.intent === "inactive_staff") {
    const inactive = allStaff.filter((s) => !s.active);
    if (inactive.length === 0) return response({ message: "Sab staff active hain." });
    return response({ message: `Inactive staff:\n\n${inactive.map((s) => `• **${s.full_name}** — ${s.role_title}`).join("\n")}` });
  }

  if (parsed.intent === "business_info") {
    const b = business as Record<string, unknown>;
    return response({ message: `**${b.name as string}**\n• Category: ${b.category as string}\n• Address: ${b.address as string}, ${b.city as string}\n• Phone: ${b.phone as string}\n• Email: ${(b.email as string) || "N/A"}\n• Description: ${(b.description as string) || "N/A"}` });
  }

  return response({ message: "Main aap ke business ke baare mein questions ka jawab de sakta hoon. Poochein jaise: aaj ki appointments, revenue, staff schedule, ya service price." });
}

// ── Main server ──────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    if (req.method !== "POST") return response({ error: "Method not allowed." }, 405);
    const authorization = req.headers.get("Authorization");
    if (!authorization) return response({ error: "Please sign in to use the assistant." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) return response({ error: "The assistant is not available right now." }, 500);
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return response({ error: "Please sign in to use the assistant." }, 401);

    // Fetch the user's role to route to the correct handler
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile) return response({ error: "Profile not found. Please complete your account setup." }, 403);
    const role = (profile as Record<string, unknown>).role as string;

    const body = await req.json() as { messages?: IncomingMessage[]; confirm_booking?: BookingProposal & { start_time: string; end_time: string }; mode?: "customer" | "owner" };
    const messages = Array.isArray(body.messages) ? body.messages.filter((message) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string") : [];
    if (messages.length === 0) return response({ error: "Please enter a message." }, 400);

    // Route by role or explicit mode
    if (role === "business_owner" && body.mode !== "customer") {
      try {
        return await handleOwnerRequest(supabase, { id: user.id }, messages);
      } catch (error) {
        console.error("[ai-appointment-assistant] owner handler:", error);
        const message = error instanceof Error ? error.message : "The assistant could not complete that request.";
        return response({ error: message });
      }
    }
    return await handleCustomerRequest(supabase, { id: user.id }, messages, { confirm_booking: body.confirm_booking });
  } catch (error) {
    console.error("[ai-appointment-assistant]", error);
    const message = error instanceof Error ? error.message : "The assistant could not complete that request.";
    return response({ error: message });
  }
});
