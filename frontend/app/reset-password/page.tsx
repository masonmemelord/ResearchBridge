import { AccountCodeFlow } from "../../components/auth/AccountCodeFlow";

export default function ResetPasswordPage() {
  return <AccountCodeFlow mode="recovery" />;
}
