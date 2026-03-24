import asyncio
import time
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

async def test_all():
    print("Testing STT API...")
    whisper_key = os.getenv("WHISPER_API_KEY")
    start = time.monotonic()
    
    # Fake audio
    audio_bytes = b"RIFF\x2a\x00\x00\x00WEBM\x42\x82\x84webm\x42\x87\x81\x04\x42\xf2\x81\x04\x42\xf3\x81\x08\x42\x82\x84webm\x42\x87\x81\x04\x42\xf2\x81\x04\x42\xf3\x81\x08"
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {whisper_key}"},
                files={"file": ("audio.webm", audio_bytes, "audio/webm")},
                data={"model": "whisper-1", "language": "en"},
                timeout=10.0
            )
            print(f"Whisper STT result: {resp.status_code}, time: {time.monotonic()-start:.2f}s")
            print(f"Whisper resp: {resp.text[:100]}")
        except Exception as e:
            print(f"Whisper STT Error: {e}, time: {time.monotonic()-start:.2f}s")

    print("\nTesting Gemini API...")
    gemini_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL")
    start = time.monotonic()
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?key={gemini_key}&alt=sse"
    payload = {"contents": [{"role": "user", "parts": [{"text": "Hello! How are you?"}]}]}
    
    async with httpx.AsyncClient() as client:
        try:
            async with client.stream("POST", url, json=payload, timeout=60.0) as resp:
                import json
                first = True
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        if first:
                            print(f"Gemini First Token: {time.monotonic()-start:.2f}s")
                            first = False
            print(f"Gemini stream finished. Total time: {time.monotonic()-start:.2f}s")
        except Exception as e:
            print(f"Gemini Error: {e}, time: {time.monotonic()-start:.2f}s")
            
    print("\nTesting Ollama API...")
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("OLLAMA_MODEL", "exaone3.5:7.8b")
    start = time.monotonic()
    
    payload = {"model": model, "messages": [{"role": "user", "content": "Hello!"}], "stream": True}
    async with httpx.AsyncClient() as client:
        try:
            async with client.stream("POST", f"{ollama_url}/api/chat", json=payload, timeout=60.0) as resp:
                first = True
                async for line in resp.aiter_lines():
                    if line.strip():
                        if first:
                            print(f"Ollama First Token: {time.monotonic()-start:.2f}s")
                            first = False
            print(f"Ollama stream finished. Total time: {time.monotonic()-start:.2f}s")
        except Exception as e:
            print(f"Ollama Error: {e}, time: {time.monotonic()-start:.2f}s")

if __name__ == "__main__":
    asyncio.run(test_all())
