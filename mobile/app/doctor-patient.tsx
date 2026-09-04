import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEffect, useState } from "react";

import Button from "../components/Button";
import {
  DoctorPatientDetail,
  getDoctorPatient,
} from "../lib/api";

export default function DoctorPatientScreen() {
  const { patient_id } =
    useLocalSearchParams<{
      patient_id: string;
    }>();

  const [data, setData] =
    useState<DoctorPatientDetail | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  async function load() {
    if (!patient_id) return;

    try {
      setLoading(true);

      const result =
        await getDoctorPatient(patient_id);

      setData(result);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [patient_id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          style={styles.loader}
        />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>
            Patient unavailable
          </Text>

          <Button
            title="Back"
            onPress={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>
          PATIENT RECORD
        </Text>

        <Text style={styles.title}>
          {data.patient.name}
        </Text>

        <Text style={styles.email}>
          {data.patient.email}
        </Text>

        <Text style={styles.section}>
          Assessment History
        </Text>

        {data.assessments.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.text}>
              This patient has no saved assessments.
            </Text>
          </View>
        ) : (
          data.assessments.map(
            (assessment) => (
              <View
                key={assessment.id}
                style={styles.card}
              >
                <Text
                  style={[
                    styles.risk,
                    assessment.risk ===
                    "HIGH"
                      ? styles.high
                      : styles.low,
                  ]}
                >
                  {assessment.risk}
                </Text>

                <Text style={styles.probability}>
                  Model probability:{" "}
                  {(
                    assessment.probability *
                    100
                  ).toFixed(1)}
                  %
                </Text>

                <Text style={styles.date}>
                  {new Date(
                    assessment.created_at
                  ).toLocaleString()}
                </Text>

                <Text style={styles.sectionSmall}>
                  Patient Inputs
                </Text>

                {assessment.patient_data &&
                  Object.entries(
                    assessment.patient_data
                  ).map(
                    ([key, value]) => (
                      <View
                        key={key}
                        style={
                          styles.inputRow
                        }
                      >
                        <Text
                          style={
                            styles.inputKey
                          }
                        >
                          {key}
                        </Text>

                        <Text
                          style={
                            styles.inputValue
                          }
                        >
                          {String(value)}
                        </Text>
                      </View>
                    )
                  )}

                <Text
                  style={styles.sectionSmall}
                >
                  AI Explanation
                </Text>

                <View style={styles.aiCard}>
                  <Text style={styles.aiText}>
                    {assessment.ai_explanation ||
                      "No AI explanation is available for this assessment."}
                  </Text>
                </View>
              </View>
            )
          )
        )}

        <Button
          title="Back to Patients"
          variant="secondary"
          onPress={() =>
            router.replace(
              "/doctor-patients"
            )
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  content: {
    padding: 24,
    paddingBottom: 40,
  },

  loader: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D4ED8",
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
  },

  email: {
    color: "#64748B",
    marginTop: 5,
  },

  section: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 24,
    marginBottom: 12,
  },

  sectionSmall: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 20,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 19,
    marginBottom: 14,
  },

  risk: {
    fontSize: 25,
    fontWeight: "900",
  },

  high: {
    color: "#DC2626",
  },

  low: {
    color: "#16A34A",
  },

  probability: {
    color: "#2563EB",
    fontWeight: "700",
    marginTop: 5,
  },

  date: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 6,
  },

  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  inputKey: {
    flex: 1,
    fontSize: 12,
    color: "#64748B",
  },

  inputValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },

  aiCard: {
    backgroundColor: "#EEF4FF",
    borderRadius: 15,
    padding: 16,
  },

  aiText: {
    color: "#334155",
    lineHeight: 22,
    fontSize: 13,
  },

  text: {
    color: "#64748B",
  },
});