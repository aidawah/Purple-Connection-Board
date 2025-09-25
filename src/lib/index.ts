import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v2";
admin.initializeApp();

const WORK_DOMAIN = "healthspaces.com"; 

// Tag new users at account creation
export const tagDomainAdminsOnCreate = functions.auth.user().onCreate(async (user) => {
  const email = (user.email || "").toLowerCase();
  if (email.endsWith(`@${WORK_DOMAIN}`)) {
    await admin.auth().setCustomUserClaims(user.uid, { domainAdmin: true });
  }
});

// Keep claims correct on every sign-in
export const tagDomainAdminsOnSignIn = functions.identity.beforeSignIn(async (event) => {
  const email = (event.user.email || "").toLowerCase();
  const isDomain = email.endsWith(`@${WORK_DOMAIN}`);
  const current = event.user.customClaims || {};
  if (isDomain && current.domainAdmin !== true) {
    await admin.auth().setCustomUserClaims(event.user.uid, { ...current, domainAdmin: true });
  } else if (!isDomain && current.domainAdmin) {
    const { domainAdmin, ...rest } = current;
    await admin.auth().setCustomUserClaims(event.user.uid, rest);
  }
});
