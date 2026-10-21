import { Alert } from 'react-native';

import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/error-message';
import { signOut } from '@/state/store';

/** "Use a different account": signs out, e.g. for someone who signed up with the wrong email. */
export function SwitchAccountButton() {
  const onPress = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Could not sign out', errorMessage(error, 'Try again.'));
    }
  };

  return <Button label="Use a different account" variant="ghost" onPress={() => void onPress()} />;
}
