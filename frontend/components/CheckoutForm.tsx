"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart";
import { cartErrorMessage } from "@/lib/cart-core";
import {
  buildCustomerPayload,
  WooCheckoutClient,
  type CheckoutAddress,
  type CheckoutPreparation,
  type CheckoutSnapshot,
  type WooCountry,
} from "@/lib/checkout-core";
import { formatPrice } from "@/lib/utils";

const blankAddress = (country = "US"): CheckoutAddress => ({
  first_name: "", last_name: "", company: "", address_1: "", address_2: "",
  city: "", state: "", postcode: "", country, email: "", phone: "",
});

type AddressKey = keyof CheckoutAddress;

function sameDeliveryAddress(billing: CheckoutAddress, shipping: CheckoutAddress): boolean {
  return ["first_name", "last_name", "company", "address_1", "address_2", "city", "state", "postcode", "country"]
    .every((key) => (billing[key as AddressKey] ?? "").trim().toLocaleLowerCase()
      === (shipping[key as AddressKey] ?? "").trim().toLocaleLowerCase());
}

function CheckoutInput({
  label, name, value, onChange, required = false, type = "text", autoComplete,
}: {
  label: string;
  name: AddressKey;
  value: string;
  onChange: (name: AddressKey, value: string) => void;
  required?: boolean;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-[10px] uppercase tracking-[0.2em] text-steel">
      {label}{required ? " *" : ""}
      <input
        name={name}
        value={value}
        type={type}
        required={required}
        autoComplete={autoComplete}
        onChange={(event) => onChange(name, event.target.value)}
        className="mt-2 w-full border border-graphite bg-bg px-4 py-3 text-sm normal-case tracking-normal text-bone outline-none transition-colors focus:border-bone"
      />
    </label>
  );
}

function AddressFields({
  value, onChange, countries, billing,
}: {
  value: CheckoutAddress;
  onChange: (name: AddressKey, value: string) => void;
  countries: WooCountry[];
  billing: boolean;
}) {
  const country = countries.find((entry) => entry.code === value.country);
  const states = country?.states ?? [];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {billing ? (
        <div className="sm:col-span-2">
          <CheckoutInput label="Email" name="email" value={value.email ?? ""} onChange={onChange}
            required type="email" autoComplete="email" />
        </div>
      ) : null}
      <CheckoutInput label="First name" name="first_name" value={value.first_name} onChange={onChange}
        required autoComplete={billing ? "billing given-name" : "shipping given-name"} />
      <CheckoutInput label="Last name" name="last_name" value={value.last_name} onChange={onChange}
        required autoComplete={billing ? "billing family-name" : "shipping family-name"} />
      <div className="sm:col-span-2">
        <CheckoutInput label="Company (optional)" name="company" value={value.company ?? ""} onChange={onChange}
          autoComplete={billing ? "billing organization" : "shipping organization"} />
      </div>
      <div className="sm:col-span-2">
        <CheckoutInput label="Address" name="address_1" value={value.address_1} onChange={onChange}
          required autoComplete={billing ? "billing address-line1" : "shipping address-line1"} />
      </div>
      <div className="sm:col-span-2">
        <CheckoutInput label="Apartment / suite (optional)" name="address_2" value={value.address_2 ?? ""} onChange={onChange}
          autoComplete={billing ? "billing address-line2" : "shipping address-line2"} />
      </div>
      <CheckoutInput label="City" name="city" value={value.city} onChange={onChange}
        required autoComplete={billing ? "billing address-level2" : "shipping address-level2"} />
      <CheckoutInput label="Postal code" name="postcode" value={value.postcode} onChange={onChange}
        required autoComplete={billing ? "billing postal-code" : "shipping postal-code"} />
      <label className="block text-[10px] uppercase tracking-[0.2em] text-steel">
        Country *
        <select name="country" required value={value.country} onChange={(event) => {
          onChange("country", event.target.value);
          onChange("state", "");
        }} className="mt-2 w-full border border-graphite bg-bg px-4 py-3 text-sm normal-case tracking-normal text-bone outline-none focus:border-bone">
          {countries.map((entry) => <option key={entry.code} value={entry.code}>{entry.name}</option>)}
        </select>
      </label>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-steel">
        Region{states.length > 0 ? " *" : ""}
        {states.length > 0 ? (
          <select name="state" required value={value.state} onChange={(event) => onChange("state", event.target.value)}
            className="mt-2 w-full border border-graphite bg-bg px-4 py-3 text-sm normal-case tracking-normal text-bone outline-none focus:border-bone">
            <option value="">Select region</option>
            {states.map((entry) => <option key={entry.code} value={entry.code}>{entry.name}</option>)}
          </select>
        ) : (
          <input name="state" value={value.state} autoComplete={billing ? "billing address-level1" : "shipping address-level1"}
            onChange={(event) => onChange("state", event.target.value)}
            className="mt-2 w-full border border-graphite bg-bg px-4 py-3 text-sm normal-case tracking-normal text-bone outline-none focus:border-bone" />
        )}
      </label>
      {billing ? (
        <div className="sm:col-span-2">
          <CheckoutInput label="Phone (optional unless required for delivery)" name="phone" value={value.phone ?? ""}
            onChange={onChange} type="tel" autoComplete="tel" />
        </div>
      ) : null}
    </div>
  );
}

export function CheckoutForm() {
  const client = useMemo(() => new WooCheckoutClient(), []);
  const searchParams = useSearchParams();
  const { refreshCart } = useCart();
  const [checkout, setCheckout] = useState<CheckoutSnapshot>();
  const [countries, setCountries] = useState<WooCountry[]>([]);
  const [billing, setBilling] = useState<CheckoutAddress>(blankAddress());
  const [shipping, setShipping] = useState<CheckoutAddress>(blankAddress());
  const [shippingSame, setShippingSame] = useState(true);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<CheckoutPreparation>();
  const mutationActive = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([client.getCart(), client.getCountries()]).then(([cart, countryList]) => {
      if (!active) return;
      setCheckout(cart);
      setCountries(countryList);
      if (cart.billingAddress.email || cart.billingAddress.address_1) setBilling(cart.billingAddress);
      if (cart.shippingAddress.address_1) {
        setShipping(cart.shippingAddress);
        setShippingSame(sameDeliveryAddress(cart.billingAddress, cart.shippingAddress));
      }
    }).catch((cause) => active && setError(cartErrorMessage(cause)));
    return () => { active = false; };
  }, [client]);

  const mutate = async (operation: () => Promise<CheckoutSnapshot>) => {
    if (mutationActive.current) return;
    mutationActive.current = true;
    setBusy(true);
    setError(undefined);
    setPrepared(undefined);
    try {
      const next = await operation();
      setCheckout(next);
      await refreshCart().catch(() => undefined);
    } catch (cause) {
      setError(cartErrorMessage(cause));
    } finally {
      mutationActive.current = false;
      setBusy(false);
    }
  };

  const changeBilling = (name: AddressKey, value: string) => setBilling((current) => ({ ...current, [name]: value }));
  const changeShipping = (name: AddressKey, value: string) => setShipping((current) => ({ ...current, [name]: value }));

  const submitAddress = (event: FormEvent) => {
    event.preventDefault();
    const delivery = shippingSame ? { ...billing, email: "" } : shipping;
    try {
      const billingCountry = countries.find((entry) => entry.code === billing.country);
      const shippingCountry = countries.find((entry) => entry.code === delivery.country);
      if (billingCountry?.states.length && !billing.state) throw new Error("Select the billing region.");
      if (shippingCountry?.states.length && !delivery.state) throw new Error("Select the shipping region.");
      const payload = buildCustomerPayload(billing, delivery);
      void mutate(() => client.updateCustomer(payload));
    } catch (cause) {
      setError(cartErrorMessage(cause));
    }
  };

  const preparePayPal = async () => {
    if (mutationActive.current) return;
    mutationActive.current = true;
    setBusy(true);
    setError(undefined);
    try { setPrepared(await client.preparePayPal()); }
    catch (cause) { setError(cartErrorMessage(cause)); }
    finally { mutationActive.current = false; setBusy(false); }
  };

  const continueToPayPal = async () => {
    if (!prepared?.executionEnabled || mutationActive.current) return;
    mutationActive.current = true;
    setBusy(true);
    setError(undefined);
    try { window.location.assign(await client.executePayPal()); }
    catch (cause) { setError(cartErrorMessage(cause)); setBusy(false); mutationActive.current = false; }
  };

  if (!checkout && !error) return <p className="mt-16 text-xs uppercase tracking-[0.2em] text-steel">Loading checkout…</p>;
  if (!checkout) return <p className="mt-16 text-sm text-bone" role="alert">{error}</p>;
  if (checkout.items.length === 0) return (
    <div className="mt-16 border border-graphite bg-onyx p-8">
      <p className="font-display text-4xl uppercase text-bone">Your bag is empty</p>
      <Link href="/shop" className="mt-6 inline-block border border-bone px-6 py-3 text-[10px] uppercase tracking-[0.24em]">Shop products</Link>
    </div>
  );

  return (
    <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
      <form onSubmit={submitAddress} className="space-y-10" data-testid="checkout-address-form">
        {searchParams.get("payment") === "cancelled" ? (
          <div role="status" data-testid="paypal-cancelled" className="border border-bone px-5 py-4 text-sm text-bone">
            PayPal was cancelled. The order is not marked as paid. You can review the checkout and try again later.
          </div>
        ) : null}
        <section className="border border-graphite bg-onyx p-5 sm:p-8">
          <p className="mb-6 text-[10px] uppercase tracking-[0.28em] text-steel">Billing details</p>
          <AddressFields value={billing} onChange={changeBilling} countries={countries} billing />
        </section>
        <section className="border border-graphite bg-onyx p-5 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[10px] uppercase tracking-[0.28em] text-steel">Shipping address</p>
            <label className="flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-steel">
              <input type="checkbox" checked={shippingSame} onChange={(event) => setShippingSame(event.target.checked)} />
              Same as billing
            </label>
          </div>
          {!shippingSame ? <AddressFields value={shipping} onChange={changeShipping} countries={countries} billing={false} /> : (
            <p className="text-sm leading-7 text-steel">Your billing address will also be used for delivery.</p>
          )}
          <button type="submit" disabled={busy || countries.length === 0}
            className="mt-8 w-full border border-bone px-6 py-4 text-[10px] uppercase tracking-[0.24em] text-bone transition-colors hover:bg-bone hover:text-bg disabled:cursor-not-allowed disabled:border-graphite disabled:text-steel">
            {busy ? "Updating…" : "Update address and calculate shipping"}
          </button>
        </section>

        {checkout.shippingPackages.map((pkg) => (
          <section key={pkg.packageId} className="border border-graphite bg-onyx p-5 sm:p-8" data-testid={`shipping-package-${pkg.packageId}`}>
            <p className="mb-5 text-[10px] uppercase tracking-[0.28em] text-steel">Shipping method</p>
            {pkg.rates.length === 0 ? <p className="text-sm text-bone">Shipping is currently unavailable for this destination.</p> : (
              <div className="space-y-3">
                {pkg.rates.map((rate) => (
                  <label key={rate.rateId} className="flex cursor-pointer items-start justify-between gap-4 border border-graphite p-4 text-sm text-bone has-[:checked]:border-bone">
                    <span className="flex gap-3">
                      <input type="radio" name={`shipping-${pkg.packageId}`} checked={rate.selected} disabled={busy}
                        onChange={() => void mutate(() => client.selectShippingRate(pkg.packageId, rate.rateId))} />
                      <span>
                        <span className="block">{rate.name}</span>
                        {rate.deliveryTime ? <span className="mt-1 block text-xs text-steel">{rate.deliveryTime}</span> : null}
                      </span>
                    </span>
                    <span>{formatPrice(rate.price + rate.taxes, rate.currency)}</span>
                  </label>
                ))}
              </div>
            )}
          </section>
        ))}
        {error ? <p role="alert" className="border border-graphite px-5 py-4 text-sm text-bone">{error}</p> : null}
      </form>

      <aside className="h-fit border border-graphite bg-onyx p-5 lg:sticky lg:top-28 sm:p-8" aria-label="Order summary">
        <p className="text-[10px] uppercase tracking-[0.28em] text-steel">Order summary</p>
        <ul className="mt-5 divide-y divide-graphite">
          {checkout.items.map((item) => (
            <li key={item.key} className="flex items-start justify-between gap-5 py-4">
              <div>
                <p className="text-sm uppercase text-bone">{item.name} × {item.qty}</p>
                {item.attributes.length ? <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-steel">
                  {item.attributes.map((attribute) => `${attribute.name}: ${attribute.value}`).join(" · ")}
                </p> : null}
              </div>
              <span className="text-sm text-bone">{formatPrice(item.total, item.currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-5 space-y-3 border-t border-graphite pt-5 text-xs uppercase tracking-[0.14em]">
          <div className="flex justify-between"><dt className="text-steel">Subtotal</dt><dd>{formatPrice(checkout.subtotal, checkout.currency)}</dd></div>
          <div className="flex justify-between"><dt className="text-steel">Shipping</dt><dd>{formatPrice(checkout.shipping, checkout.currency)}</dd></div>
          <div className="flex justify-between"><dt className="text-steel">Taxes</dt><dd>{formatPrice(checkout.totalTax, checkout.currency)}</dd></div>
          <div className="flex justify-between border-t border-graphite pt-4 text-sm"><dt>Total</dt><dd data-testid="checkout-total">{formatPrice(checkout.total, checkout.currency)}</dd></div>
          <div className="flex justify-between text-[10px]"><dt className="text-steel">Currency</dt><dd data-testid="checkout-currency">{checkout.currency}</dd></div>
        </dl>
        <button type="button" disabled={busy} onClick={() => void preparePayPal()}
          className="mt-7 w-full border border-bone px-6 py-4 text-[10px] uppercase tracking-[0.24em] text-bone transition-colors hover:bg-bone hover:text-bg disabled:cursor-not-allowed disabled:border-graphite disabled:text-steel">
          {busy ? "Checking…" : "Review order"}
        </button>
        {prepared ? (
          <div data-testid="paypal-preparation" className="mt-4 border border-graphite p-4 text-xs leading-6 text-steel">
            <p>Your final total is {formatPrice(checkout.total, prepared.currency)}.</p>
            {prepared.executionEnabled ? (
              <button type="button" disabled={busy} onClick={() => void continueToPayPal()}
                className="mt-4 w-full border border-bone px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-bone">
                Continue to PayPal
              </button>
            ) : <p className="mt-2 text-bone">Checkout is temporarily unavailable. Please try again later.</p>}
          </div>
        ) : null}
        <p className="mt-6 text-[10px] leading-5 tracking-[0.08em] text-steel">
          By placing your order, you agree to our <Link className="text-bone underline underline-offset-4" href="/terms">Terms &amp; Conditions</Link> and acknowledge our <Link className="text-bone underline underline-offset-4" href="/privacy">Privacy Policy</Link>.
        </p>
        <nav aria-label="Checkout policies" className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] uppercase tracking-[0.14em] text-steel">
          <Link className="hover:text-bone" href="/shipping">Shipping Policy</Link>
          <Link className="hover:text-bone" href="/returns">Returns &amp; Refunds</Link>
        </nav>
      </aside>
    </div>
  );
}
