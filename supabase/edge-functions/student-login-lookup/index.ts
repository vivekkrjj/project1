import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers: {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"}});
  try {
    const {identifier} = await req.json();
    const value = String(identifier ?? "").trim();
    if (!value) return new Response(JSON.stringify({error:"Login ID is required."}), {status:400,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {auth:{autoRefreshToken:false,persistSession:false}});
    const normalized = value.toLowerCase();
    const query = normalized.includes("@")
      ? db.from("student_registration_requests").select("email,status").ilike("email",normalized).limit(1)
      : db.from("student_registration_requests").select("email,status").or("mobile.eq."+value.replace(/[^0-9]/g,"")+",roll_number.ilike."+value).limit(1);
    const {data,error}=await query;
    if(error) throw error;
    if(!data?.[0]) return new Response(JSON.stringify({error:"Student not found. Use your registered email, mobile number, or roll number."}),{status:404,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
    if(data[0].status !== "approved") {
      const msg=data[0].status === "rejected" ? "Your registration was rejected. Please contact the college office." : data[0].status === "banned" ? "Your student account has been banned. Please contact the college office." : "Your registration is still pending admin approval.";
      return new Response(JSON.stringify({error:msg}),{status:403,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
    }
    return new Response(JSON.stringify({email:data[0].email}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  } catch {
    return new Response(JSON.stringify({error:"Login lookup service error."}),{status:500,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  }
});
