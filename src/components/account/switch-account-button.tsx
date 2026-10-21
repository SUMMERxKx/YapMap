import { Button } from '@/components/ui/button';
import { signOut } from '@/state/store';

/** "Use a different account": signs out, e.g. for someone who signed up with the wrong email. */
export function SwitchAccountButton() {
  return <Button label="Use a different account" variant="ghost" onPress={() => void signOut()} />;
}
