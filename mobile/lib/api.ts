import { getToken } from "./auth";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://192.168.1.10:8000";

type RequestOptions = {
  method?: string;
  body?: unknown;
  authenticated?: boolean;
};

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    authenticated = false,
  } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authenticated) {
    const token = await getToken();

    if (!token) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined,
    });
  } catch {
    throw new Error(
      "Unable to connect to the server. Please check that the backend is running."
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let message = "Something went wrong.";

    if (typeof data?.detail === "string") {
      message = data.detail;
    } else if (data?.detail?.missing_features) {
      message = `Missing fields: ${data.detail.missing_features.join(
        ", "
      )}`;
    }

    throw new Error(message);
  }

  return data;
}

export type User = {
  id: string;
  name: string;
  email: string;
  role: "patient" | "doctor" | string;
};

export type RegisterResponse = User;

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type PredictionResponse = {
  mode: string;
  risk: "HIGH" | "LOW";
  probability: number;
  threshold?: number;
  top_factors?: string[];
  message: string;
  assessment_id?: string | null;
  ai_explanation?: string | null;
};

export type Assessment = {
  id: string;
  user_id: string;
  mode: string;
  risk: "HIGH" | "LOW";
  probability: number;
  threshold?: number;
  created_at: string;
  patient_data?: Record<string, unknown>;
  ai_explanation?: string | null;
};

export type Doctor = {
  id: string;
  name: string;
  email: string;
  role: "doctor";
};

export type Appointment = {
  id: string;
  status: string;
  requested_at: string;
  appointment_date?: string | null;
  notes?: string | null;
  doctor?: {
    id: string;
    name: string;
    email: string;
  };
  patient?: {
    id: string;
    name: string;
    email: string;
  };
  latest_assessment?: {
    risk: "HIGH" | "LOW";
    probability: number;
    created_at: string;
  } | null;
};

export type DoctorPatient = {
  id: string;
  name: string;
  email: string;
  latest_assessment?: {
    risk: "HIGH" | "LOW";
    probability: number;
    created_at: string;
  } | null;
};

export type DoctorPatientDetail = {
  patient: User;
  assessments: Assessment[];
};

export function register(
  name: string,
  email: string,
  password: string,
  role: "patient" | "doctor"
) {
  return request<RegisterResponse>("/auth/register", {
    method: "POST",
    body: {
      name,
      email,
      password,
      role,
    },
  });
}

export function login(
  email: string,
  password: string
) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: {
      email,
      password,
    },
  });
}

export function predict(
  patientData: Record<string, unknown>
) {
  return request<PredictionResponse>("/predict", {
    method: "POST",
    authenticated: true,
    body: {
      patient_data: patientData,
    },
  });
}

export function getAssessments() {
  return request<Assessment[]>("/assessments", {
    authenticated: true,
  });
}

export function getDoctors() {
  return request<Doctor[]>("/doctors", {
    authenticated: true,
  });
}

export function createAppointment(
  doctorId: string,
  notes?: string
) {
  return request<Appointment>("/appointments", {
    method: "POST",
    authenticated: true,
    body: {
      doctor_id: doctorId,
      notes: notes || null,
    },
  });
}

export function getAppointments() {
  return request<Appointment[]>("/appointments", {
    authenticated: true,
  });
}

export function getDoctorAppointments() {
  return request<Appointment[]>(
    "/doctor/appointments",
    {
      authenticated: true,
    }
  );
}

export function updateAppointmentStatus(
  appointmentId: string,
  status:
    | "ACCEPTED"
    | "REJECTED"
    | "COMPLETED"
    | "CANCELLED"
) {
  return request<Appointment>(
    `/doctor/appointments/${appointmentId}`,
    {
      method: "PATCH",
      authenticated: true,
      body: {
        status,
      },
    }
  );
}

export function getDoctorPatients() {
  return request<DoctorPatient[]>(
    "/doctor/patients",
    {
      authenticated: true,
    }
  );
}

export function getDoctorPatient(
  patientId: string
) {
  return request<DoctorPatientDetail>(
    `/doctor/patients/${patientId}`,
    {
      authenticated: true,
    }
  );
}