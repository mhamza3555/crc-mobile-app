import os

from dotenv import load_dotenv
from google import genai

load_dotenv()


def generate_risk_explanation(
    patient_data: dict,
    risk: str,
    probability: float,
) -> str:

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return (
            "AI explanation is currently unavailable because the "
            "AI service is not configured. Your model-based risk "
            "result is still available. Please discuss the result "
            "with a qualified healthcare professional."
        )

    try:
        client = genai.Client(api_key=api_key)

        prompt = f"""
You are an educational health-information assistant inside a
prototype colorectal cancer risk assessment application.

The application uses a machine-learning model to estimate
colorectal cancer risk. You MUST NOT diagnose cancer.

Your job is to explain the result to the patient in very simple,
clear and reassuring language.

PATIENT INFORMATION:
{patient_data}

MACHINE LEARNING RESULT:
Risk category: {risk}
Model probability: {probability * 100:.1f}%

Write a personalized explanation based ONLY on the information
provided above.

Your response MUST contain these sections:

WHAT YOUR RESULT MEANS
Explain what the LOW or HIGH model risk means in simple words.
Clearly explain that this is an estimated risk and NOT a diagnosis.

FACTORS THAT MAY BE IMPORTANT
Mention the relevant symptoms, history, examination findings,
or test results that were actually provided by this patient.
Do not invent anything.
Explain medical terms in simple language.

WHAT YOU SHOULD DO NEXT
Give practical, general next steps.
If the model risk is HIGH, strongly recommend discussing the
result with a qualified doctor.
If the model risk is LOW, explain that a low model risk does
not completely rule out disease and that concerning symptoms
should still be discussed with a doctor.

WHEN TO SEEK MEDICAL ATTENTION
Mention concerning symptoms or situations from the information
provided that should prompt medical evaluation.
Do not create symptoms that the patient did not report.

IMPORTANT NOTE
Clearly state that this tool does not diagnose colorectal cancer
and does not replace a doctor's assessment.

SAFETY RULES:
- Never say the patient has cancer.
- Never say that one symptom proves cancer.
- Do not invent symptoms, diagnoses, test results or treatments.
- Only discuss information actually provided.
- Do not prescribe medication.
- Do not recommend a specific medication or dose.
- Do not give a definitive diagnosis.
- Use simple language suitable for a general patient.
- Be reassuring but do not falsely reassure the patient.
- Keep the response around 250-350 words.
"""

        response = client.models.generate_content(
            model="gemini-3.7-flash",
            contents=prompt,
        )

        if response.text:
            return response.text.strip()

        return (
            "The AI service did not return an explanation. "
            "Your model-based risk result is still available. "
            "Please discuss the result with a qualified "
            "healthcare professional."
        )

    except Exception as error:
        print(f"Gemini AI error: {error}")

        return (
            "The AI explanation service is temporarily unavailable. "
            "Your model-based risk result is still available. "
            "Please discuss your result and symptoms with a "
            "qualified healthcare professional."
        )