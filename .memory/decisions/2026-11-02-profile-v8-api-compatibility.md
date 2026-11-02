# Decisions: Profile v8 API Compatibility

- Date: 2026-11-02
- Status: Confirmed

## D01. Supported profile versions
- **Chosen**: The profile API accepts both v7 and v8 writes. It stores and returns a v7 payload in v7 form, and stores and returns v8 with its goal celebration settings.
- **Rationale**: Existing browser data and older clients must keep working while the new game sends v8. The 400 error comes from the API accepting only v7.

## D02. v8 goal celebration validation
- **Chosen**: For v8, validate `goalCelebration` as either `{ mode: 'random', ceremonyId: null }` or `{ mode: 'specific', ceremonyId: <supported celebration id> }`; preserve the field in the API result.
- **Rationale**: The API must persist the user's chosen ceremony without accepting malformed or unsupported values.
