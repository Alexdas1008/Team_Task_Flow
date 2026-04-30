import { Show } from "@clerk/react";
import { Redirect } from "wouter";
import { LandingPage } from "./landing";

export function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}
