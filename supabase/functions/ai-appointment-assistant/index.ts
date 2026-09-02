import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const pakistanOffset = "+05:00";

type IncomingMessage = { role: "user" | "assistant"; content: string };
type Intent = "browse_businesses" | "book" | "list_appointments" | "cancel" | "general";
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

type CatalogBusiness = { id: string; name: string; category: string; city: string };
type CatalogService = { id: string; business_id: string; name: string; description: string | null; duration_minutes: number; price: number };
type CatalogStaff = { id: string; business_id: string; full_name: string; role_title: string };
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

async function parseWithGemini(messages: IncomingMessage[], catalog: { businesses: CatalogBusiness[]; services: CatalogService[]; staff: CatalogStaff[] }): Promise<ParsedRequest> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("The AI assistant is not configured yet.");

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const catalogText = JSON.stringify(catalog);
  const prompt = `You are BookEasy AI, a Pakistani appointment assistant. Understand English, Urdu script, Roman Urdu, and mixed messages. Return only valid JSON matching this shape: {"intent":"browse_businesses|book|list_appointments|cancel|general","service_query":string|null,"business_query":string|null,"staff_query":string|null,"date":"YYYY-MM-DD"|null,"time":"HH:mm"|null,"appointment_query":string|null,"confirmation":boolean}.
Today in Pakistan is ${today}. Resolve relative dates such as kal, tomorrow, aaj, this weekend into YYYY-MM-DD. Convert times such as 2 PM, do baje, and 14:00 into 24-hour HH:mm. Use intent book for requests to find, suggest, or book a service; use browse_businesses when the user asks to see available salons/businesses; use list_appointments for asking about existing bookings; use cancel for cancel requests. Never invent IDs or values. confirmation is true only if the user clearly confirms a previously presented booking.
Business/service/staff catalog: ${catalogText}
Conversation: ${JSON.stringify(messages.slice(-12))}`;

  const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    }),
  });
  if (!geminiResponse.ok) throw new Error("The AI service is temporarily unavailable.");
  const payload = await geminiResponse.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("The AI service returned an invalid response.");
  const parsed = JSON.parse(text) as Partial<ParsedRequest>;
  return {
    intent: parsed.intent && ["browse_businesses", "book", "list_appointments", "cancel", "general"].includes(parsed.intent) ? parsed.intent : "general",
    service_query: typeof parsed.service_query === "string" ? parsed.service_query : null,
    business_query: typeof parsed.business_query === "string" ? parsed.business_query : null,
    staff_query: typeof parsed.staff_query === "string" ? parsed.staff_query : null,
    date: typeof parsed.date === "string" ? parsed.date : null,
    time: typeof parsed.time === "string" ? parsed.time : null,
    appointment_query: typeof parsed.appointment_query === "string" ? parsed.appointment_query : null,
    confirmation: parsed.confirmation === true,
  };
}

function businessListText(businesses: CatalogBusiness[]): string {
  if (businesses.length === 0) return "Abhi koi approved business available nahi hai. Please baad mein check karein.";
  return `Yeh available businesses hain:\n\n${businesses.map((business) => `• **${business.name}** — ${business.category}, ${business.city}`).join("\n")}\n\nAap kis business mein booking karwana chahte hain?`;
}

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

    const body = await req.json() as { messages?: IncomingMessage[]; confirm_booking?: BookingProposal & { start_time: string; end_time: string } };
    const messages = Array.isArray(body.messages) ? body.messages.filter((message) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string") : [];
    if (messages.length === 0) return response({ error: "Please enter a message." }, 400);

    const [{ data: businesses, error: businessError }, { data: services, error: serviceError }, { data: staff, error: staffError }] = await Promise.all([
      supabase.from("businesses").select("id,name,category,city").eq("status", "approved").order("created_at", { ascending: false }),
      supabase.from("services").select("id,business_id,name,description,duration_minutes,price").eq("active", true),
      supabase.from("staff").select("id,business_id,full_name,role_title").eq("active", true),
    ]);
    if (businessError || serviceError || staffError) return response({ error: "I couldn't load the available booking options. Please try again." }, 500);

    const catalog = {
      businesses: (businesses || []) as CatalogBusiness[],
      services: ((services || []) as Record<string, unknown>[]).map((service) => ({ ...service, price: Number(service.price) })) as CatalogService[],
      staff: (staff || []) as CatalogStaff[],
    };

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

    const parsed = await parseWithGemini(messages, catalog);

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

    if (parsed.intent !== "book") return response({ message: "Bilkul, main aap ki appointment mein madad kar sakta hoon. Service, business, date ya time bata dein." });

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
      return response({ message: `**${requestedSlot.start_time ? formatTime(requestedSlot.start_time) : parsed.time}** available hai. **${selectedService.name}** at **${selectedBusiness.name}** with **${selectedStaff.full_name}** — kya main confirm kar doon?`, suggested_slots: [requestedSlot], booking_proposal: proposal, pending_action: "confirm" });
    }
    return response({ message: `${formatPakistanDate(parsed.date)} ke available slots yeh hain:`, suggested_slots: slots.slice(0, 12), booking_proposal: proposal, pending_action: "book" });
  } catch (error) {
    console.error("[ai-appointment-assistant]", error);
    const message = error instanceof Error ? error.message : "The assistant could not complete that request.";
    return response({ error: message }, 500);
  }
});
