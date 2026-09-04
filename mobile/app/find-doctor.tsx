import { router } from "expo-router";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEffect, useState } from "react";

import Button from "../components/Button";
import {
  Doctor,
  createAppointment,
  getDoctors,
} from "../lib/api";

export default function FindDoctorScreen() {
  const [doctors, setDoctors] =
    useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] =
    useState<string | null>(null);

  async function loadDoctors() {
    try {
      const data = await getDoctors();
      setDoctors(data);
    } catch (error) {
      Alert.alert(
        "Unable to load doctors",
        error instanceof Error
          ? error.message
          : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDoctors();
  }, []);

  async function requestAppointment(
    doctor: Doctor
  ) {
    try {
      setRequesting(doctor.id);

      await createAppointment(
        doctor.id,
        "Appointment requested through CRC risk assessment app."
      );

      Alert.alert(
        "Request sent",
        `Your appointment request has been sent to Dr. ${doctor.name}.`,
        [
          {
            text: "View Appointments",
            onPress: () =>
              router.push("/appointments"),
          },
          {
            text: "OK",
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Request failed",
        error instanceof Error
          ? error.message
          : "Unable to request appointment."
      );
    } finally {
      setRequesting(null);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          Find a Doctor
        </Text>

        <Text style={styles.subtitle}>
          Select a doctor to request an appointment.
        </Text>

        {loading ? (
          <Text style={styles.message}>
            Loading doctors...
          </Text>
        ) : doctors.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              No doctors available
            </Text>

            <Text style={styles.text}>
              No doctor accounts are currently
              available.
            </Text>
          </View>
        ) : (
          doctors.map((doctor) => (
            <View
              key={doctor.id}
              style={styles.card}
            >
              <Text style={styles.name}>
                Dr. {doctor.name}
              </Text>

              <Text style={styles.email}>
                {doctor.email}
              </Text>

              <View style={styles.spacing} />

              <Button
                title={
                  requesting === doctor.id
                    ? "Requesting..."
                    : "Request Appointment"
                }
                loading={
                  requesting === doctor.id
                }
                onPress={() =>
                  requestAppointment(doctor)
                }
              />
            </View>
          ))
        )}

        <Button
          title="Back to Dashboard"
          variant="secondary"
          onPress={() =>
            router.replace("/dashboard")
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },

  name: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  email: {
    marginTop: 5,
    color: "#64748B",
  },

  text: {
    color: "#64748B",
    lineHeight: 21,
  },

  spacing: {
    height: 16,
  },
});