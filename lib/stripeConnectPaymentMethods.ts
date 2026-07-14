import type Stripe from "stripe";
import { requireStripe } from "@/lib/stripe";
import { stripeConnectOptions } from "@/lib/stripeConnect";

/** Capabilities requested for NL Express coach accounts (direct charges). */
export const COACH_CONNECT_ACCOUNT_CAPABILITIES: Stripe.AccountCreateParams.Capabilities =
  {
    card_payments: { requested: true },
    transfers: { requested: true },
    sepa_debit_payments: { requested: true },
    ideal_payments: { requested: true },
    bancontact_payments: { requested: true },
  };

/** Coaching subscription checkout: enable on the connected account PM config. */
export const COACH_CONNECT_PAYMENT_METHODS_ENABLE = [
  "ideal",
  "bancontact",
  "sepa_debit",
] as const;

/** Coaching subscription checkout: disable on the connected account PM config. */
export const COACH_CONNECT_PAYMENT_METHODS_DISABLE = ["klarna"] as const;

/** Enable only when Stripe marks the method available on the connected account. */
export const COACH_CONNECT_PAYMENT_METHODS_OPTIONAL_ENABLE = ["paypal"] as const;

/** @deprecated Use COACH_CONNECT_PAYMENT_METHODS_ENABLE for new code. */
export const COACH_CONNECT_PAYMENT_METHOD_KEYS = [
  ...COACH_CONNECT_PAYMENT_METHODS_ENABLE,
] as const;

export type CoachConnectPaymentMethodKey =
  (typeof COACH_CONNECT_PAYMENT_METHODS_ENABLE)[number];

export type CoachConnectPaymentMethodDisableKey =
  (typeof COACH_CONNECT_PAYMENT_METHODS_DISABLE)[number];

export type PaymentMethodConfigureResult = {
  configurationId: string | null;
  enabled: string[];
  disabled: string[];
  skipped: string[];
  errors: string[];
};

/** @deprecated Use PaymentMethodConfigureResult */
export type PaymentMethodEnableResult = PaymentMethodConfigureResult & {
  updated: string[];
};

export type ConnectPaymentCapabilityStatus = {
  card_payments: string | null;
  ideal_payments: string | null;
  bancontact_payments: string | null;
  sepa_debit_payments: string | null;
};

export type ConnectPaymentMethodDisplayStatus = Record<
  CoachConnectPaymentMethodKey | CoachConnectPaymentMethodDisableKey | "paypal" | "link",
  { available: boolean | null; display: string | null }
>;

type PaymentMethodState = {
  available?: boolean;
  display_preference?: { value?: string; preference?: string };
};

function readPaymentMethodState(
  configuration: Stripe.PaymentMethodConfiguration,
  methodKey: string,
): PaymentMethodState | undefined {
  return configuration[methodKey as keyof Stripe.PaymentMethodConfiguration] as
    | PaymentMethodState
    | undefined;
}

export function buildCoachConnectPaymentMethodUpdatePayload(
  configuration: Stripe.PaymentMethodConfiguration,
): Stripe.PaymentMethodConfigurationUpdateParams {
  const updatePayload: Stripe.PaymentMethodConfigurationUpdateParams = {};

  for (const methodKey of COACH_CONNECT_PAYMENT_METHODS_ENABLE) {
    const methodState = readPaymentMethodState(configuration, methodKey);
    if (methodState?.display_preference?.value === "on") continue;
    updatePayload[methodKey] = {
      display_preference: { preference: "on" },
    };
  }

  for (const methodKey of COACH_CONNECT_PAYMENT_METHODS_DISABLE) {
    const methodState = readPaymentMethodState(configuration, methodKey);
    if (methodState?.display_preference?.value === "off") continue;
    updatePayload[methodKey] = {
      display_preference: { preference: "off" },
    };
  }

  for (const methodKey of COACH_CONNECT_PAYMENT_METHODS_OPTIONAL_ENABLE) {
    const methodState = readPaymentMethodState(configuration, methodKey);
    if (!methodState?.available) continue;
    if (methodState.display_preference?.value === "on") continue;
    updatePayload[methodKey] = {
      display_preference: { preference: "on" },
    };
  }

  return updatePayload;
}

export function mapConnectPaymentCapabilities(
  account: Stripe.Account,
): ConnectPaymentCapabilityStatus {
  const caps = account.capabilities ?? {};
  const readStatus = (value: unknown): string | null => {
    if (typeof value === "string") return value;
    if (
      value &&
      typeof value === "object" &&
      "status" in value &&
      typeof (value as { status?: unknown }).status === "string"
    ) {
      return (value as { status: string }).status;
    }
    return null;
  };

  return {
    card_payments: readStatus(caps.card_payments),
    ideal_payments: readStatus(caps.ideal_payments),
    bancontact_payments: readStatus(caps.bancontact_payments),
    sepa_debit_payments: readStatus(caps.sepa_debit_payments),
  };
}

export async function resolveDefaultCoachPaymentMethodConfigurationId(
  stripe: Stripe,
  connectAccountId: string,
): Promise<string | null> {
  const requestOptions = stripeConnectOptions(connectAccountId);
  const configs = await stripe.paymentMethodConfigurations.list(
    { limit: 20 },
    requestOptions,
  );
  const configuration =
    configs.data.find((entry) => entry.is_default) ?? configs.data[0] ?? null;
  return configuration?.id ?? null;
}

export async function getConnectPaymentMethodDisplayStatus(
  stripe: Stripe,
  connectAccountId: string,
): Promise<ConnectPaymentMethodDisplayStatus | null> {
  const requestOptions = stripeConnectOptions(connectAccountId);
  const configs = await stripe.paymentMethodConfigurations.list(
    { limit: 20 },
    requestOptions,
  );
  const configuration =
    configs.data.find((entry) => entry.is_default) ?? configs.data[0] ?? null;
  if (!configuration) return null;

  const readMethod = (methodKey: string) => {
    const methodState = readPaymentMethodState(configuration, methodKey);
    return {
      available: methodState?.available ?? null,
      display: methodState?.display_preference?.value ?? null,
    };
  };

  return {
    ideal: readMethod("ideal"),
    bancontact: readMethod("bancontact"),
    sepa_debit: readMethod("sepa_debit"),
    klarna: readMethod("klarna"),
    paypal: readMethod("paypal"),
    link: readMethod("link"),
  };
}

export async function requestCoachConnectPaymentCapabilities(
  stripe: Stripe,
  connectAccountId: string,
): Promise<void> {
  await stripe.accounts.update(connectAccountId, {
    capabilities: COACH_CONNECT_ACCOUNT_CAPABILITIES,
  });
}

export async function configureCoachConnectPaymentMethods(
  stripe: Stripe,
  connectAccountId: string,
): Promise<PaymentMethodConfigureResult> {
  const requestOptions = stripeConnectOptions(connectAccountId);
  const result: PaymentMethodConfigureResult = {
    configurationId: null,
    enabled: [],
    disabled: [],
    skipped: [],
    errors: [],
  };

  const configs = await stripe.paymentMethodConfigurations.list(
    { limit: 20 },
    requestOptions,
  );

  const configuration =
    configs.data.find((entry) => entry.is_default) ?? configs.data[0] ?? null;

  if (!configuration) {
    result.errors.push("Geen payment method configuration gevonden op het coach-account.");
    return result;
  }

  result.configurationId = configuration.id;
  const updatePayload = buildCoachConnectPaymentMethodUpdatePayload(configuration);

  for (const methodKey of COACH_CONNECT_PAYMENT_METHODS_ENABLE) {
    if (!(methodKey in updatePayload)) {
      result.skipped.push(methodKey);
    }
  }
  for (const methodKey of COACH_CONNECT_PAYMENT_METHODS_DISABLE) {
    if (!(methodKey in updatePayload)) {
      result.skipped.push(`${methodKey}:off`);
    }
  }
  for (const methodKey of COACH_CONNECT_PAYMENT_METHODS_OPTIONAL_ENABLE) {
    const methodState = readPaymentMethodState(configuration, methodKey);
    if (!methodState?.available) {
      result.skipped.push(`${methodKey}:unavailable`);
    } else if (!(methodKey in updatePayload)) {
      result.skipped.push(methodKey);
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return result;
  }

  try {
    await stripe.paymentMethodConfigurations.update(
      configuration.id,
      updatePayload,
      requestOptions,
    );

    for (const methodKey of Object.keys(updatePayload)) {
      if (
        (COACH_CONNECT_PAYMENT_METHODS_DISABLE as readonly string[]).includes(methodKey)
      ) {
        result.disabled.push(methodKey);
      } else {
        result.enabled.push(methodKey);
      }
    }
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : "Payment methods configureren mislukt.",
    );
  }

  return result;
}

/** @deprecated Use configureCoachConnectPaymentMethods */
export async function enableCoachConnectPaymentMethods(
  stripe: Stripe,
  connectAccountId: string,
): Promise<PaymentMethodEnableResult> {
  const result = await configureCoachConnectPaymentMethods(stripe, connectAccountId);
  return {
    ...result,
    updated: [...result.enabled, ...result.disabled],
  };
}

export async function ensureCoachConnectPaymentSetup(
  connectAccountId: string,
): Promise<PaymentMethodConfigureResult> {
  const stripe = requireStripe();

  try {
    await requestCoachConnectPaymentCapabilities(stripe, connectAccountId);
  } catch (error) {
    return {
      configurationId: null,
      enabled: [],
      disabled: [],
      skipped: [],
      errors: [
        `capabilities: ${error instanceof Error ? error.message : "onbekende fout"}`,
      ],
    };
  }

  return configureCoachConnectPaymentMethods(stripe, connectAccountId);
}

export async function prepareCoachConnectCheckoutPaymentMethods(
  connectAccountId: string,
): Promise<{ configurationId: string | null; errors: string[] }> {
  const stripe = requireStripe();
  const result = await configureCoachConnectPaymentMethods(stripe, connectAccountId);
  return {
    configurationId: result.configurationId,
    errors: result.errors,
  };
}
