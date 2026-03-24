"""
Seed conversation scenarios
"""
import asyncio
import uuid

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.models import ConversationScenario


async def seed_conversation_scenarios():
    """Seed conversation scenario data"""
    async with async_session_factory() as db:
        # Check if scenarios already exist
        result = await db.execute(select(ConversationScenario))
        existing = result.scalars().first()
        if existing:
            print("✓ Conversation scenarios already seeded")
            return

        scenarios = [
            ConversationScenario(
                id=uuid.uuid4(),
                title="Greeting",
                title_ko="인사하기",
                character_name="Luna",
                description="Learn how to greet people in English",
                required_month=1,
                prompt_template="""You are Luna, a friendly fairy who helps children learn English.
The child is learning basic greetings. Keep your responses simple and encouraging.
Use short sentences. Praise the child when they respond correctly.
Ask questions like "How are you?" and "What's your name?"
""",
                sample_starters='["Hello!", "Hi there!", "Good morning!"]',
                is_active=True,
            ),
            ConversationScenario(
                id=uuid.uuid4(),
                title="Introduce Yourself",
                title_ko="자기소개",
                character_name="Sunny",
                description="Practice introducing yourself",
                required_month=1,
                prompt_template="""You are Sunny, a cheerful fairy who loves meeting new friends.
Help the child practice self-introduction in English.
Ask simple questions like "What's your name?", "How old are you?", "What do you like?"
Keep sentences short and simple. Give lots of encouragement!
""",
                sample_starters='["Tell me about yourself!", "What is your name?", "Nice to meet you!"]',
                is_active=True,
            ),
            ConversationScenario(
                id=uuid.uuid4(),
                title="Family Talk",
                title_ko="가족 이야기",
                character_name="Star",
                description="Talk about your family members",
                required_month=2,
                prompt_template="""You are Star, a kind fairy who loves families.
Help the child practice talking about family members in English.
Use simple questions like "Do you have siblings?", "Who is in your family?"
Teach words like mother, father, sister, brother, grandma, grandpa.
Be patient and encouraging!
""",
                sample_starters='["Tell me about your family!", "Do you have siblings?", "Who do you live with?"]',
                is_active=True,
            ),
            ConversationScenario(
                id=uuid.uuid4(),
                title="Favorite Things",
                title_ko="좋아하는 것들",
                character_name="Rainbow",
                description="Share your favorite things",
                required_month=2,
                prompt_template="""You are Rainbow, a colorful fairy who loves learning about likes and dislikes.
Help the child express preferences in English.
Ask questions like "What's your favorite color?", "What food do you like?"
Use simple sentence patterns: "I like...", "My favorite is..."
Make it fun and engaging!
""",
                sample_starters='["What is your favorite color?", "What food do you like?", "Tell me your favorite!"]',
                is_active=True,
            ),
            ConversationScenario(
                id=uuid.uuid4(),
                title="Daily Routine",
                title_ko="하루 일과",
                character_name="Moon",
                description="Describe your daily activities",
                required_month=3,
                prompt_template="""You are Moon, a gentle fairy who knows about daily routines.
Help the child describe daily activities in English.
Teach time expressions and action verbs: wake up, eat breakfast, go to school, etc.
Use simple present tense. Ask "What do you do in the morning?"
Be supportive and positive!
""",
                sample_starters='["What time do you wake up?", "What do you do after school?", "Tell me about your day!"]',
                is_active=True,
            ),
            ConversationScenario(
                id=uuid.uuid4(),
                title="At the Park",
                title_ko="공원에서",
                character_name="Blossom",
                description="Talk about outdoor activities",
                required_month=3,
                prompt_template="""You are Blossom, a playful fairy who loves nature.
Help the child talk about park activities and outdoor play.
Teach action words: run, jump, play, swing, slide.
Ask what they like to do at the park.
Keep it simple and fun!
""",
                sample_starters='["What do you do at the park?", "Do you like to play outside?", "Lets talk about the park!"]',
                is_active=True,
            ),
            ConversationScenario(
                id=uuid.uuid4(),
                title="Weather Talk",
                title_ko="날씨 이야기",
                character_name="Cloud",
                description="Describe different types of weather",
                required_month=4,
                prompt_template="""You are Cloud, a weather-loving fairy.
Help the child describe weather in English.
Teach words: sunny, rainy, cloudy, windy, hot, cold.
Ask "How's the weather today?"
Use simple sentences!
""",
                sample_starters='["How is the weather today?", "What is your favorite weather?", "Do you like rain?"]',
                is_active=True,
            ),
            ConversationScenario(
                id=uuid.uuid4(),
                title="School Life",
                title_ko="학교 생활",
                character_name="Wisdom",
                description="Talk about school and learning",
                required_month=4,
                prompt_template="""You are Wisdom, a smart fairy who loves learning.
Help the child talk about school in English.
Teach school-related words: teacher, classmate, subject, homework.
Ask about their favorite subject.
Encourage learning!
""",
                sample_starters='["What is your favorite subject?", "Do you like school?", "Tell me about your teacher!"]',
                is_active=True,
            ),
        ]

        for scenario in scenarios:
            db.add(scenario)

        await db.commit()
        print(f"✓ Created {len(scenarios)} conversation scenarios")


if __name__ == "__main__":
    asyncio.run(seed_conversation_scenarios())
