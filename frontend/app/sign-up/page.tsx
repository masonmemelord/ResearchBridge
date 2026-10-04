import { redirect } from "next/navigation";
import { publicSignupEnabled } from "../../lib/release";
import StudentSignup from "./StudentSignup";

export default function SignUpPage() {
  // Server gate: direct visits cannot render the unfinished production signup.
  if (!publicSignupEnabled()) redirect("/access");
  return <StudentSignup />;
}
