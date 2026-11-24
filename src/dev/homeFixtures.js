// Dev-only: worst-case data for the Home page's trust strip and routes list,
// used by the break-ui toggle (?data=worst | empty | one in the address bar,
// before the #). Never shipped: Home only reads this when import.meta.env.DEV.
//
// Every value is realistic: real Pakistani city names that are longer than
// today's eight, a city added without a code, a pair missing from the
// trip-time table, and trust copy about 30% longer (as a translation would be).

export const HOME_FIXTURES = {
  worst: {
    trust: [
      {
        fact: 'Four eligibility checks on every single traveller before they are ranked',
        detail: 'Route, departure time against your deadline, spare kilograms, and whether the vehicle may carry this item type.',
      },
      { fact: 'A code at each end' }, // detail missing
      {
        fact: 'Money held until delivery',
        detail: 'Released when the delivery code is entered. After three wrong codes the delivery goes to an admin and the money is frozen.',
      },
    ],
    routes: [
      { from: 'Islamabad', to: 'Muzaffarabad (Azad Jammu and Kashmir)', fromCode: 'ISB', toCode: 'MFG', hours: 3.5 },
      { from: 'Islamabad', to: 'Mandi Bahauddin', fromCode: 'ISB', toCode: undefined, hours: 3 }, // no code yet
      { from: 'Islamabad', to: 'Rahim Yar Khan', fromCode: 'ISB', toCode: 'RYK', hours: undefined }, // not in the trip table
      { from: 'Islamabad', to: 'Dera Ghazi Khan', fromCode: 'ISB', toCode: 'DGK', hours: 9 },
      { from: 'Islamabad', to: 'Rawalpindi', fromCode: 'ISB', toCode: 'RWP', hours: 0.5 },
    ],
  },
  empty: { routes: [] },
  one: { routes: [{ from: 'Islamabad', to: 'Lahore', fromCode: 'ISB', toCode: 'LHE', hours: 4.5 }] },
}
