# saana-sms-compliance-review

Purpose: review messaging and consent changes.

Use this for Twilio, SMS copy, consent capture, STOP/HELP handling, missed-call recovery, IVR, A2P campaign, and messaging workflow changes.

## Checklist

- Opt-in is not preselected.
- Consent is unbundled from unrelated terms, checkout, or marketing choices.
- STOP and HELP language is present where required.
- Message frequency disclosure is clear.
- Data and message rates language is present where required.
- Transactional and marketing messages remain separated.
- Twilio A2P campaign behavior and message copy stay consistent with registered use.
- IVR press-1 consent path is preserved when relevant.
- Opt-out and resubscribe paths do not accidentally send prohibited messages.
- Consent records, audit logs, and provider failure handling are preserved.

## Compliance Failure Rules

If the SMS/compliance review detects unsafe messaging behavior, consent weakness, policy mismatch, or provider risk:

1. Classify severity:

- Critical: missing consent, bundled consent, unauthorized marketing messages, prohibited opt-out behavior, A2P-breaking behavior, messaging without legal basis, or exposed customer messaging data.
- High: missing STOP/HELP language, broken opt-out handling, IVR consent mismatch, campaign-copy mismatch, missing audit trail, or accidental transactional/marketing mixing.
- Medium: unclear frequency disclosure, weak consent UX clarity, inconsistent copy, or incomplete provider failure handling.
- Low: wording improvements, copy polish, or non-critical UX clarification.

2. Required action:

For Critical issues:

- Stop deploy and commit immediately.
- Disable affected messaging flow if already deployed.
- Rerun SMS Compliance Review after fix.
- Create an incident note if there is real operational learning.
- Review provider exposure risk with Twilio/A2P registration assumptions.

For High issues:

- Apply the smallest safe compliance fix before deploy.
- Rerun Browser QA for consent and messaging flows.
- Rerun Security Review if customer messaging records, consent logs, or provider integrations changed.
- Rerun Payment Review if checkout consent/payment messaging overlap exists.

For Medium issues:

- Fix immediately if low-risk and narrow.
- Otherwise document remaining compliance risk and follow-up.

For Low issues:

- Record for future copy/UX improvement.

3. Before closure:

- Confirm consent flow was retested end-to-end.
- Confirm STOP/HELP behavior works correctly.
- Confirm opt-out and resubscribe behavior is preserved.
- Confirm transactional and marketing boundaries remain separated.
- Confirm provider-facing copy still matches A2P registration and intended behavior.
- Record any remaining compliance risk or provider-review dependency.

## Output

State whether the change is compliant enough to proceed, any required copy changes, and any legal or provider review that remains outside the code review.
