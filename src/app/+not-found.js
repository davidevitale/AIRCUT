import { StyleSheet, Text, View } from "react-native";
import React from "react";

const index = () => {
  return (
    <View style={styles.container}>
      <Text>+not-found</Text>
    </View>
  );
};

export default index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "lightgray",
  },
});
