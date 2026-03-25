import os
import sqlite3
import asyncio
import logging
from typing import Annotated
from dotenv import load_dotenv
from livekit.agents import JobContext, WorkerOptions, cli, llm
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import sarvam, openai, silero

# Simple logging
logger = logging.getLogger("lifeline-agent")
logger.setLevel(logging.INFO)

load_dotenv()

# Database helper
DB_PATH = "lifeline.db"

def get_doctors_list():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name, specialty, availability_days, availability_time FROM doctors WHERE status = 'active'")
    doctors = cursor.fetchall()
    conn.close()
    return doctors

def book_appointment_db(name, phone, doctor_name, date, time):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        # Find doctor ID by name
        cursor.execute("SELECT id FROM doctors WHERE name = ?", (doctor_name,))
        row = cursor.fetchone()
        if not row:
            return f"Error: Doctor {doctor_name} not found."
        
        doctor_id = row[0]
        cursor.execute(
            "INSERT INTO appointments (patient_name, phone, doctor_id, appointment_date, appointment_time, status) VALUES (?, ?, ?, ?, ?, ?)",
            (name, phone, str(doctor_id), date, time, 'pending')
        )
        conn.commit()
        conn.close()
        return f"Successfully booked appointment for {name} with {doctor_name} on {date} at {time}."
    except Exception as e:
        return f"Database error: {str(e)}"

# Define the Assistant Tools
class AssistantTools(llm.FunctionContext):
    @llm.ai_callable(description="Check available doctors and their specialties")
    def list_doctors(self) -> str:
        doctors = get_doctors_list()
        if not doctors:
            return "No doctors available currently."
        
        info = "Available Doctors:\n"
        for d in doctors:
            info += f"- {d[0]} ({d[1]}) | {d[2]}, {d[3]}\n"
        return info

    @llm.ai_callable(description="Book an appointment for a patient")
    def book_appointment(
        self,
        patient_name: Annotated[str, llm.TypeInfo(description="Full name of the patient")],
        phone: Annotated[str, llm.TypeInfo(description="Contact phone number")],
        doctor_name: Annotated[str, llm.TypeInfo(description="Name of the doctor as listed in the database")],
        date: Annotated[str, llm.TypeInfo(description="Date of appointment (YYYY-MM-DD or friendly format)")],
        time: Annotated[str, llm.TypeInfo(description="Preferred time for the appointment")]
    ) -> str:
        logger.info(f"Booking appointment for {patient_name} with {doctor_name}")
        result = book_appointment_db(patient_name, phone, doctor_name, date, time)
        return result

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room {ctx.room.name}")
    await ctx.connect()

    # System prompt
    chat_context = llm.ChatContext().append(
        role="system",
        text=(
            "You are a friendly and professional AI medical receptionist for 'LifeLine Hospital' in Mumbai. "
            "Your Goal is to help patients book appointments. "
            "Address: Andheri West, Near Metro Station, Mumbai. "
            "Use warm Indian English accent. Be brief and don't use too much medical jargon. "
            "If asked about a doctor, use 'list_doctors' tool. "
            "To book an appointment, ask for the patient's name, phone, doctor, date, and time, then use 'book_appointment' tool. "
            "Always confirm once a booking tool returns success."
        ),
    )

    # Use Sarvam for STT and TTS
    # Use OpenAI for the LLM brain (require OPENAI_API_KEY in .env)
    
    agent = VoicePipelineAgent(
        vad=silero.VAD.load(), # Using Silero VAD for silence detection
        stt=sarvam.STT(api_key=os.getenv("SARVAM_API_KEY")),
        llm=openai.LLM(
            api_key=os.getenv("GROQ_API_KEY") or os.getenv("OPENAI_API_KEY"), 
            model="llama-3.1-70b-versatile",
            base_url="https://api.groq.com/openai/v1"
        ),
        tts=sarvam.TTS(api_key=os.getenv("SARVAM_API_KEY")),
        chat_ctx=chat_context,
        fnc_ctx=AssistantTools(),
    )

    agent.start(ctx.room)
    await agent.say("Hello, thank you for calling LifeLine Hospital. How can I assist you today?", allow_interruptions=True)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
