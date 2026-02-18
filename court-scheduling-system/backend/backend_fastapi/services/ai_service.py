from openai import OpenAI
from backend_fastapi.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def generate_response(prompt: str, context: str = ""):
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a legal assistant AI for a court scheduling system. Use the provided context to answer questions accurately. Do not invent laws."},
                {"role": "user", "content": f"Context: {context}\n\nQuestion: {prompt}"}
            ],
            temperature=0.3,
            max_tokens=500
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error calling OpenAI: {e}")
        return "I apologize, but I am unable to process your request at this time."
