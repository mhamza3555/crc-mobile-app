import { router } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect, useState } from "react";

import Button from "../components/Button";
import {
  DoctorPatient,
  getDoctorPatients,
} from "../lib/api";

export default function DoctorPatientsScreen() {
  const [patients, setPatients] =
    useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setPatients(
        await getDoctorPatients()
      );
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          My Patients
        </Text>

        <Text style={styles.subtitle}>
          Patients who have an accepted appointment
          with you.
        </Text>

        {loading ? (
          <Text style={styles.message}>
            Loading...
          </Text>
        ) : patients.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              No assigned patients
            </Text>

            <Text style={styles.text}>
              Accepted appointment requests will
              appear here.
            </Text>
          </View>
        ) : (
          patients.map((patient) => (
            <TouchableOpacity
              key={patient.id}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname:
                    "/doctor-patient",
                  params: {
                    patient_id: patient.id,
                  },
                })
              }
            >
              <Text style={styles.name}>
                {patient.name}
              </Text>

              <Text style={styles.email}>
                {patient.email}
              </Text>

              {patient.latest_assessment ? (
                <Text
                  style={[
                    styles.risk,
                    patient.latest_assessment
                      .risk === "HIGH"
                      ? styles.high
                      : styles.low,
                  ]}
                >
                  Latest:{" "}
                  {
                    patient.latest_assessment
                      .risk
                  }{" "}
                  —{" "}
                  {(
                    patient.latest_assessment
                      .probability * 100
                  ).toFixed(1)}
                  %
                </Text>
              ) : (
                <Text style={styles.text}>
                  No assessment yet
                </Text>
              )}

              <Text style={styles.link}>
                View patient →
              </Text>
            </TouchableOpacity>
          ))
        )}

        <Button
          title="Back to Dashboard"
          variant="secondary"
          onPress={() =>
            router.replace(
              "/doctor-dashboard"
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

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  subtitle: {
    color: "#64748B",
    marginBottom: 22,
  },

  message: {
    color: "#64748B",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 20,
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  name: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  email: {
    color: "#64748B",
    marginTop: 4,
  },

  risk: {
    marginTop: 14,
    fontWeight: "900",
  },

  high: {
    color: "#DC2626",
  },

  low: {
    color: "#16A34A",
  },

  text: {
    marginTop: 14,
    color: "#64748B",
  },

  link: {
    marginTop: 14,
    color: "#2563EB",
    fontWeight: "700",
  },
});