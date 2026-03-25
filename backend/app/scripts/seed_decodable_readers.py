"""
Seed script for Decodable Readers (Month 1-3)

Usage:
    python -m app.scripts.seed_decodable_readers

This script creates 12 decodable readers for beginner English learners.
"""
from __future__ import annotations

import asyncio
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.models.models import Story, StoryPage, StoryQuiz


async def create_story_with_pages_and_quizzes(
    session: AsyncSession,
    title: str,
    target_month: int,
    lexile_min: int,
    lexile_max: int,
    pages: list[str],
    quizzes: list[dict[str, Any]],
    author: str = "English Fairy Team",
    genre: str = "decodable fiction",
) -> Story:
    """Helper function to create a complete story"""
    story_id = str(uuid.uuid4())

    # Create story
    story = Story(
        id=story_id,
        title=title,
        author=author,
        genre=genre,
        lexile_min=lexile_min,
        lexile_max=lexile_max,
        page_count=len(pages),
        target_month=target_month,
        is_fiction=True,
        is_active=True,
    )
    session.add(story)

    # Create pages
    for idx, text in enumerate(pages, start=1):
        words = [w.strip() for w in text.split() if w.strip()]
        words_data = [{"word": w, "type": "regular"} for w in words]

        page = StoryPage(
            id=str(uuid.uuid4()),
            story_id=story_id,
            page_number=idx,
            text_content=text,
            words_data=words_data,
        )
        session.add(page)

    # Create quizzes
    for quiz_data in quizzes:
        quiz = StoryQuiz(
            id=str(uuid.uuid4()),
            story_id=story_id,
            question_type=quiz_data["type"],
            question_text=quiz_data["question"],
            choices=quiz_data["choices"],
            correct_index=quiz_data["correct"],
        )
        session.add(quiz)

    return story


async def seed_month_1_stories(session: AsyncSession):
    """Month 1: CVC words only"""
    print("📚 Creating Month 1 stories (CVC focus)...")

    # Story 1: Cat and Rat
    await create_story_with_pages_and_quizzes(
        session,
        title="Cat and Rat",
        target_month=1,
        lexile_min=20,
        lexile_max=60,
        pages=[
            "A cat and a rat.",
            "The cat sat.",
            "The rat ran.",
            "The cat ran.",
            "The rat hid.",
            "The cat nap.",
        ],
        quizzes=[
            {
                "type": "comprehension",
                "question": "Who sat?",
                "choices": ["The rat", "The cat", "The dog", "The pig"],
                "correct": 1,
            },
            {
                "type": "comprehension",
                "question": "What did the rat do?",
                "choices": ["Sat", "Ran and hid", "Nap", "Jumped"],
                "correct": 1,
            },
            {
                "type": "vocabulary",
                "question": "What does 'nap' mean?",
                "choices": ["Run", "Sleep", "Eat", "Play"],
                "correct": 1,
            },
        ],
    )

    # Story 2: Dan Can
    await create_story_with_pages_and_quizzes(
        session,
        title="Dan Can",
        target_month=1,
        lexile_min=20,
        lexile_max=60,
        pages=[
            "Dan can run.",
            "Dan can hop.",
            "Dan can jump.",
            "Dan can sit.",
            "Can you?",
            "Yes, I can!",
        ],
        quizzes=[
            {
                "type": "comprehension",
                "question": "What can Dan do?",
                "choices": ["Only run", "Run, hop, jump, and sit", "Only jump", "Only sit"],
                "correct": 1,
            },
            {
                "type": "pattern",
                "question": "What pattern do you see?",
                "choices": ["Dan is", "Dan has", "Dan can", "Dan said"],
                "correct": 2,
            },
            {
                "type": "personal",
                "question": "Can you hop?",
                "choices": ["Yes, I can", "No, I cannot", "Maybe", "I don't know"],
                "correct": 0,
            },
        ],
    )

    # Story 3: The Red Hen
    await create_story_with_pages_and_quizzes(
        session,
        title="The Red Hen",
        target_month=1,
        lexile_min=30,
        lexile_max=70,
        pages=[
            "A red hen.",
            "A big pen.",
            "Ten red eggs.",
            "Peck, peck, peck!",
            "Ten chicks hop.",
            "The hen and ten chicks.",
        ],
        quizzes=[
            {
                "type": "comprehension",
                "question": "What color is the hen?",
                "choices": ["Blue", "Red", "Yellow", "Green"],
                "correct": 1,
            },
            {
                "type": "counting",
                "question": "How many eggs?",
                "choices": ["Five", "Seven", "Ten", "Twelve"],
                "correct": 2,
            },
            {
                "type": "vocabulary",
                "question": "What sound does 'peck, peck, peck' mean?",
                "choices": ["Sleeping", "Eating", "Running", "Tapping with beak"],
                "correct": 3,
            },
        ],
    )

    # Story 4: Pig in Mud
    await create_story_with_pages_and_quizzes(
        session,
        title="Pig in Mud",
        target_month=1,
        lexile_min=30,
        lexile_max=70,
        pages=[
            "A big pig.",
            "The pig is hot.",
            "Mud! Wet mud!",
            "The pig jumps in.",
            "Splash! The pig is happy.",
            "Now the pig is not hot.",
        ],
        quizzes=[
            {
                "type": "comprehension",
                "question": "Why did the pig jump in mud?",
                "choices": ["It was hungry", "It was hot", "It was sad", "It was lost"],
                "correct": 1,
            },
            {
                "type": "sequence",
                "question": "What happened first?",
                "choices": ["Pig in mud", "Pig is hot", "Pig is happy", "Splash"],
                "correct": 1,
            },
            {
                "type": "inference",
                "question": "How does the pig feel at the end?",
                "choices": ["Sad", "Angry", "Happy", "Scared"],
                "correct": 2,
            },
        ],
    )

    print("✅ Month 1: 4 stories created")


async def seed_month_2_stories(session: AsyncSession):
    """Month 2: Short vowels expansion"""
    print("📚 Creating Month 2 stories...")

    # Story 5: Ben's Pet
    await create_story_with_pages_and_quizzes(
        session,
        title="Ben's Pet",
        target_month=2,
        lexile_min=40,
        lexile_max=80,
        pages=[
            "Ben has a pet.",
            "Is it a cat? No!",
            "Is it a dog? No!",
            "It is a red hen!",
            "The hen can sit on Ben's bed.",
            "Ben loves his pet hen.",
        ],
        quizzes=[
            {
                "type": "comprehension",
                "question": "What is Ben's pet?",
                "choices": ["A cat", "A dog", "A hen", "A pig"],
                "correct": 2,
            },
            {
                "type": "comprehension",
                "question": "Where can the hen sit?",
                "choices": ["On a pen", "On Ben's bed", "In mud", "In a nest"],
                "correct": 1,
            },
            {
                "type": "vocabulary",
                "question": "What does 'pet' mean?",
                "choices": ["Food", "Animal friend", "Toy", "Bed"],
                "correct": 1,
            },
        ],
    )

    # Story 6: Kit and Mitt
    await create_story_with_pages_and_quizzes(
        session,
        title="Kit and Mitt",
        target_month=2,
        lexile_min=40,
        lexile_max=80,
        pages=[
            "Kit has a mitt.",
            "Kit can hit.",
            "Hit! Hit! Hit!",
            "Mitt loves to catch.",
            "Kit and Mitt play ball.",
            "What a team!",
        ],
        quizzes=[
            {
                "type": "comprehension",
                "question": "What does Kit have?",
                "choices": ["A bat", "A mitt", "A ball", "A cap"],
                "correct": 1,
            },
            {
                "type": "comprehension",
                "question": "What can Kit do?",
                "choices": ["Run", "Hit", "Jump", "Swim"],
                "correct": 1,
            },
            {
                "type": "inference",
                "question": "What game are they playing?",
                "choices": ["Soccer", "Baseball", "Tag", "Hide and seek"],
                "correct": 1,
            },
        ],
    )

    # Story 7: The Big Bed
    await create_story_with_pages_and_quizzes(
        session,
        title="The Big Bed",
        target_month=2,
        lexile_min=40,
        lexile_max=80,
        pages=[
            "Ted has a big bed.",
            "Is there room for Jen? Yes!",
            "Is there room for Ben? Yes!",
            "Is there room for the red hen? Yes!",
            "Is there room for the cat? No!",
            "The bed is full!",
        ],
        quizzes=[
            {
                "type": "comprehension",
                "question": "Whose bed is it?",
                "choices": ["Ben's", "Ted's", "Jen's", "Cat's"],
                "correct": 1,
            },
            {
                "type": "sequence",
                "question": "Who could NOT fit on the bed?",
                "choices": ["Jen", "Ben", "The hen", "The cat"],
                "correct": 3,
            },
            {
                "type": "vocabulary",
                "question": "What does 'full' mean?",
                "choices": ["Empty", "No more room", "Big", "Small"],
                "correct": 1,
            },
        ],
    )

    # Story 8: Six Fish
    await create_story_with_pages_and_quizzes(
        session,
        title="Six Fish",
        target_month=2,
        lexile_min=50,
        lexile_max=90,
        pages=[
            "I see one fish. It is red.",
            "I see two fish. They swim fast.",
            "I see three fish. They hide.",
            "I see four fish. They are big.",
            "I see five fish. They jump!",
            "I see six fish. How many do you see?",
        ],
        quizzes=[
            {
                "type": "counting",
                "question": "How many fish in the end?",
                "choices": ["Four", "Five", "Six", "Seven"],
                "correct": 2,
            },
            {
                "type": "comprehension",
                "question": "What color is the first fish?",
                "choices": ["Blue", "Red", "Yellow", "Green"],
                "correct": 1,
            },
            {
                "type": "pattern",
                "question": "What pattern repeats?",
                "choices": ["I like", "I see", "I want", "I have"],
                "correct": 1,
            },
        ],
    )

    print("✅ Month 2: 4 stories created")


async def seed_month_3_stories(session: AsyncSession):
    """Month 3: Short o, u + sight words"""
    print("📚 Creating Month 3 stories...")

    # Story 9: Mom's Box
    await create_story_with_pages_and_quizzes(
        session,
        title="Mom's Box",
        target_month=3,
        lexile_min=50,
        lexile_max=100,
        pages=[
            "Mom has a box.",
            "What is in the box?",
            "Is it a toy? No.",
            "Is it a rock? No.",
            "It is a clock!",
            "Tick, tock, tick, tock.",
        ],
        quizzes=[
            {
                "type": "comprehension",
                "question": "What is in the box?",
                "choices": ["A toy", "A rock", "A clock", "A sock"],
                "correct": 2,
            },
            {
                "type": "vocabulary",
                "question": "What sound does a clock make?",
                "choices": ["Quack quack", "Tick tock", "Buzz buzz", "Meow meow"],
                "correct": 1,
            },
            {
                "type": "comprehension",
                "question": "Whose box is it?",
                "choices": ["Dad's", "Mom's", "Kid's", "Dog's"],
                "correct": 1,
            },
        ],
    )

    # Story 10: Run, Pup, Run!
    await create_story_with_pages_and_quizzes(
        session,
        title="Run, Pup, Run!",
        target_month=3,
        lexile_min=50,
        lexile_max=100,
        pages=[
            "A little pup.",
            "Run, pup, run!",
            "The pup runs up the hill.",
            "The pup runs to the sun.",
            "Now the pup is hot.",
            "Rest, pup, rest!",
        ],
        quizzes=[
            {
                "type": "comprehension",
                "question": "Where did the pup run?",
                "choices": ["Down the hill", "Up the hill", "To the pond", "To the den"],
                "correct": 1,
            },
            {
                "type": "inference",
                "question": "Why is the pup hot?",
                "choices": ["It is winter", "It ran to the sun", "It is cold", "It is raining"],
                "correct": 1,
            },
            {
                "type": "vocabulary",
                "question": "What does 'rest' mean?",
                "choices": ["Run more", "Stop and relax", "Eat", "Jump"],
                "correct": 1,
            },
        ],
    )

    # Story 11: Gus on the Bus
    await create_story_with_pages_and_quizzes(
        session,
        title="Gus on the Bus",
        target_month=3,
        lexile_min=60,
        lexile_max=100,
        pages=[
            "Gus gets on the bus.",
            "The bus goes up the hill.",
            "Bump! Bump! Bump!",
            "Gus jumps up and down.",
            "Stop! It is Gus's stop.",
            "Gus runs off the bus.",
        ],
        quizzes=[
            {
                "type": "comprehension",
                "question": "Who is on the bus?",
                "choices": ["Gus", "Ben", "Mom", "Cat"],
                "correct": 0,
            },
            {
                "type": "sequence",
                "question": "What happened after the bus went up the hill?",
                "choices": ["Gus got on", "Bump bump bump", "Gus ran off", "Stop"],
                "correct": 1,
            },
            {
                "type": "comprehension",
                "question": "What did Gus do at his stop?",
                "choices": ["Jumped", "Sat", "Ran off the bus", "Slept"],
                "correct": 2,
            },
        ],
    )

    # Story 12: The Sun and the Bug
    await create_story_with_pages_and_quizzes(
        session,
        title="The Sun and the Bug",
        target_month=3,
        lexile_min=60,
        lexile_max=100,
        pages=[
            "The sun is hot.",
            "A little bug sits on a rock.",
            "The bug is hot too.",
            "The bug hops to a flower.",
            "The flower has shade.",
            "Now the bug is happy!",
        ],
        quizzes=[
            {
                "type": "comprehension",
                "question": "Where did the bug sit first?",
                "choices": ["On a flower", "On a rock", "On a leaf", "On the sun"],
                "correct": 1,
            },
            {
                "type": "inference",
                "question": "Why did the bug go to the flower?",
                "choices": ["To eat", "To find shade", "To sleep", "To play"],
                "correct": 1,
            },
            {
                "type": "vocabulary",
                "question": "What is 'shade'?",
                "choices": ["Bright light", "Cool shadow", "Water", "Food"],
                "correct": 1,
            },
        ],
    )

    print("✅ Month 3: 4 stories created")


async def main():
    """Main function to seed all decodable readers"""
    print("\n🌟 Starting Decodable Readers Seed Script")
    print("=" * 60)

    async with async_session_factory() as session:
        try:
            # Seed all stories
            await seed_month_1_stories(session)
            await seed_month_2_stories(session)
            await seed_month_3_stories(session)

            # Commit
            await session.commit()

            print("\n" + "=" * 60)
            print("✅ Success! 12 Decodable Readers created")
            print("   - Month 1: 4 stories (CVC focus)")
            print("   - Month 2: 4 stories (Short vowels a, e, i)")
            print("   - Month 3: 4 stories (Short o, u + sight words)")
            print("=" * 60)

        except Exception as e:
            print(f"\n❌ Error: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(main())
