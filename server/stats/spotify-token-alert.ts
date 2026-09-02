import { renderSpotifyTokenAlert } from "@server/email/spotify-token-alert";
import { isEmailConfigured, sendEmail } from "@server/lib/email";

type SpotifyTokenAlertDependencies = {
  isEmailConfigured: typeof isEmailConfigured;
  sendEmail: typeof sendEmail;
};

type SpotifyTokenFailure = {
  errorDescription: string;
  timestamp: string;
};

export function createSpotifyTokenAlert(dependencies: SpotifyTokenAlertDependencies) {
  let alertSent = false;
  let delivery: Promise<boolean> | null = null;

  return {
    notify(failure: SpotifyTokenFailure) {
      if (alertSent || !dependencies.isEmailConfigured()) {
        return Promise.resolve(false);
      }

      delivery ??= dependencies
        .sendEmail(renderSpotifyTokenAlert(failure))
        .then((sent) => {
          alertSent = sent;
          return sent;
        })
        .finally(() => {
          delivery = null;
        });

      return delivery;
    },
    reset() {
      alertSent = false;
    },
  };
}

export const spotifyTokenAlert = createSpotifyTokenAlert({
  isEmailConfigured,
  sendEmail,
});
