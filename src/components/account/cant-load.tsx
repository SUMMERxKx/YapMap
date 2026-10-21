// Shown instead of the app when you're signed in but your profile couldn't be loaded
// (usually no connection at launch), so nobody is sent back into profile setup.

import { useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { errorMessage } from '@/lib/error-message';
import { retryLoad } from '@/state/store';

export function CantLoad() {
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      await retryLoad();
    } catch (error) {
      Alert.alert("Still can't reach Yap", errorMessage(error, 'Check your connection and try again.'));
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Screen
      footer={<Button label="Try again" onPress={() => void retry()} loading={retrying} />}>
      <EmptyState
        icon="cloud-offline-outline"
        title="Can't reach Yap"
        body="We couldn't load your profile. Check your connection and try again. We'll also keep trying."
      />
    </Screen>
  );
}
