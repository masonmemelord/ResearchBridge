import { redirect } from "next/navigation";
import { publicSignupEnabled } from "../../lib/release";
import StudentSignup from "./StudentSignup";

export default function SignUpPage() {
  // Server gate: until hosted signup email is ready, direct visits go to sign-in.
  if (!publicSignupEnabled()) redirect("/sign-in");
  return <StudentSignup />;
}
