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
            "The AI explanation service is not configured. "
            "Your model-based risk result is still available. "
            "Please discuss your result with a qualified doctor."
        )

    prompt = f"""
You are a patient education assistant for a colorectal cancer
risk assessment application.

The machine-learning model has already calculated the patient's
risk. You must NOT diagnose cancer and you must NOT change the
model result.

PATIENT INFORMATION:
{patient_data}

MODEL RESULT:
Risk: {risk}
Model probability: {probability * 100:.1f}%

Explain the result to the patient in simple everyday language.

Use EXACTLY these plain-text headings:

WHAT YOUR RESULT MEANS

FACTORS THAT MAY BE IMPORTANT

WHAT YOU SHOULD DO NEXT

WHEN TO SEEK MEDICAL ATTENTION

IMPORTANT NOTE

Instructions:

- Explain the HIGH or LOW model result clearly.
- Explain that the percentage is a computer-generated estimate,
  not a diagnosis and not proof that the patient has cancer.
- Only mention symptoms, history, examination findings and test
  results that actually appear in the patient information.
- Highlight the most relevant findings rather than listing
  everything.
- Explain medical terms in simple language.
- If the model result is HIGH, recommend arranging an appointment
  with a qualified doctor for proper evaluation.
- If the model result is LOW, explain that a low model risk does
  not completely rule out disease.
- If concerning symptoms are present, recommend discussing them
  with a doctor even if the model result is LOW.
- Mention urgent medical attention only when appropriate based
  on the information supplied.
- Never say that the patient has cancer.
- Never say that one symptom proves cancer.
- Never invent symptoms, diagnoses, test results or treatments.
- Never prescribe medication.
- Never recommend a medication or dose.
- Do not contradict or change the ML risk category.
- Do not change the model probability.
- Do not use Markdown.
- Do not use asterisks.
- Do not use bullet symbols.
- Keep each section short and easy to read.
- Total response should be approximately 180-250 words.
- Write directly for the patient, using "your" and "you".
"""

    try:
        client = genai.Client(api_key=api_key)

        interaction = client.interactions.create(
            model="gemini-3.7-flash",
            input=prompt,
            generation_config={
                "thinking_level": "low",
            },
        )

        text = (interaction.output_text or "").strip()

        if not text:
            return (
                "The AI explanation could not be generated. "
                "Your model-based risk result is still available. "
                "Please discuss your result with a qualified doctor."
            )

        # Remove accidental Markdown formatting.
        text = text.replace("**", "")
        text = text.replace("###", "")
        text = text.replace("##", "")
        text = text.replace("*", "")

        return text.strip()

    except Exception as error:
        print(
            f"Gemini AI error: {type(error).__name__}: {error}"
        )

        return (
            "The AI explanation service is temporarily unavailable. "
            "Your model-based risk result is still available. "
            "Please discuss your result with a qualified doctor."
        )