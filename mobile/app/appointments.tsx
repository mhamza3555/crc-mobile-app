import { router } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEffect, useState } from "react";

import Button from "../components/Button";
import {
  Appointment,
  getAppointments,
} from "../lib/api";

export default function AppointmentsScreen() {
  const [appointments, setAppointments] =
    useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await getAppointments();
      setAppointments(data);
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
          My Appointments
        </Text>

        <Text style={styles.subtitle}>
          Track your doctor appointment requests.
        </Text>

        {loading ? (
          <Text style={styles.message}>
            Loading appointments...
          </Text>
        ) : appointments.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              No appointments
            </Text>

            <Text style={styles.text}>
              You have not requested an appointment
              yet.
            </Text>
          </View>
        ) : (
          appointments.map((appointment) => (
            <View
              key={appointment.id}
              style={styles.card}
            >
              <Text style={styles.doctor}>
                Dr. {appointment.doctor?.name}
              </Text>

              <Text style={styles.email}>
                {appointment.doctor?.email}
              </Text>

              <Text
                style={[
                  styles.status,
                  appointment.status ===
                  "ACCEPTED"
                    ? styles.accepted
                    : appointment.status ===
                      "REJECTED"
                    ? styles.rejected
                    : styles.pending,
                ]}
              >
                {appointment.status}
              </Text>

              <Text style={styles.date}>
                Requested:{" "}
                {new Date(
                  appointment.requested_at
                ).toLocaleString()}
              </Text>
            </View>
          ))
        )}

        <Button
          title="Find a Doctor"
          onPress={() =>
            router.push("/find-doctor")
          }
        />

        <View style={styles.spacing} />

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
    marginBottom: 7,
  },

  doctor: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },

  email: {
    color: "#64748B",
    marginTop: 4,
  },

  status: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "900",
  },

  pending: {
    color: "#D97706",
  },

  accepted: {
    color: "#16A34A",
  },

  rejected: {
    color: "#DC2626",
  },

  date: {
    marginTop: 7,
    color: "#64748B",
    fontSize: 13,
  },

  text: {
    color: "#64748B",
    lineHeight: 21,
  },

  spacing: {
    height: 12,
  },
});