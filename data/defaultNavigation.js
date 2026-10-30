export const DEFAULT_NAVIGATION_MENU = [
  {
    id: 'india',
    label: 'India',
    type: 'megamenu',
    isSplit: true,
    visible: true,
    topTabs: [
      { label: 'Top Recommended Destinations', continentId: 'north' },
      { label: 'North India', continentId: 'north' },
      { label: 'South India', continentId: 'south' },
      { label: 'West & Central', continentId: 'west-central' },
      { label: 'East & North-East', continentId: 'east-ne' },
      { label: 'Islands & UTs', continentId: 'islands' },
    ],
    continents: [
      {
        id: 'north',
        name: 'North India',
        visible: true,
        allLink: { label: 'All of North India', region: 'Asia', search: 'North India' },
        countries: [
          {
            name: 'Jammu & Kashmir',
            visible: true,
            cities: [
              { label: 'Srinagar', search: 'Srinagar', visible: true },
              { label: 'Gulmarg', search: 'Gulmarg', visible: true },
              { label: 'Pahalgam', search: 'Pahalgam', visible: true },
              { label: 'Sonamarg', search: 'Sonamarg', visible: true }
            ]
          },
          {
            name: 'Himachal Pradesh',
            visible: true,
            cities: [
              { label: 'Manali', search: 'Manali', visible: true },
              { label: 'Shimla', search: 'Shimla', visible: true },
              { label: 'Dharamshala', search: 'Dharamshala', visible: true },
              { label: 'Dalhousie', search: 'Dalhousie', visible: true },
              { label: 'Spiti Valley', search: 'Spiti', visible: true }
            ]
          },
          {
            name: 'Ladakh',
            visible: true,
            cities: [
              { label: 'Leh', search: 'Leh', visible: true },
              { label: 'Nubra Valley', search: 'Nubra', visible: true },
              { label: 'Pangong Tso', search: 'Pangong', visible: true }
            ]
          },
          {
            name: 'Uttarakhand',
            visible: true,
            cities: [
              { label: 'Rishikesh', search: 'Rishikesh', visible: true },
              { label: 'Nainital', search: 'Nainital', visible: true },
              { label: 'Mussoorie', search: 'Mussoorie', visible: true },
              { label: 'Auli', search: 'Auli', visible: true },
              { label: 'Jim Corbett', search: 'Corbett', visible: true }
            ]
          },
          {
            name: 'Punjab & Delhi',
            visible: true,
            cities: [
              { label: 'Amritsar', search: 'Amritsar', visible: true },
              { label: 'New Delhi', search: 'Delhi', visible: true },
              { label: 'Chandigarh', search: 'Chandigarh', visible: true }
            ]
          },
          {
            name: 'Rajasthan',
            visible: true,
            cities: [
              { label: 'Jaipur', search: 'Jaipur', visible: true },
              { label: 'Udaipur', search: 'Udaipur', visible: true },
              { label: 'Jaisalmer', search: 'Jaisalmer', visible: true },
              { label: 'Jodhpur', search: 'Jodhpur', visible: true },
              { label: 'Pushkar', search: 'Pushkar', visible: true }
            ]
          },
          {
            name: 'Uttar Pradesh',
            visible: true,
            cities: [
              { label: 'Varanasi', search: 'Varanasi', visible: true },
              { label: 'Agra', search: 'Agra', visible: true },
              { label: 'Lucknow', search: 'Lucknow', visible: true },
              { label: 'Ayodhya', search: 'Ayodhya', visible: true }
            ]
          }
        ]
      },
      {
        id: 'south',
        name: 'South India',
        visible: true,
        allLink: { label: 'All of South India', region: 'Asia', search: 'South India' },
        countries: [
          {
            name: 'Kerala',
            visible: true,
            cities: [
              { label: 'Munnar', search: 'Munnar', visible: true },
              { label: 'Alleppey', search: 'Alleppey', visible: true },
              { label: 'Kochi', search: 'Kochi', visible: true },
              { label: 'Wayanad', search: 'Wayanad', visible: true },
              { label: 'Kovalam', search: 'Kovalam', visible: true }
            ]
          },
          {
            name: 'Karnataka',
            visible: true,
            cities: [
              { label: 'Coorg', search: 'Coorg', visible: true },
              { label: 'Mysore', search: 'Mysore', visible: true },
              { label: 'Bengaluru', search: 'Bangalore', visible: true },
              { label: 'Hampi', search: 'Hampi', visible: true },
              { label: 'Chikmagalur', search: 'Chikmagalur', visible: true }
            ]
          },
          {
            name: 'Tamil Nadu',
            visible: true,
            cities: [
              { label: 'Ooty', search: 'Ooty', visible: true },
              { label: 'Kodaikanal', search: 'Kodaikanal', visible: true },
              { label: 'Rameswaram', search: 'Rameswaram', visible: true },
              { label: 'Madurai', search: 'Madurai', visible: true },
              { label: 'Mahabalipuram', search: 'Mahabalipuram', visible: true }
            ]
          },
          {
            name: 'Andhra & Telangana',
            visible: true,
            cities: [
              { label: 'Hyderabad', search: 'Hyderabad', visible: true },
              { label: 'Visakhapatnam', search: 'Vizag', visible: true },
              { label: 'Tirupati', search: 'Tirupati', visible: true },
              { label: 'Araku Valley', search: 'Araku', visible: true }
            ]
          }
        ]
      },
      {
        id: 'west-central',
        name: 'West & Central',
        visible: true,
        allLink: { label: 'All of West & Central', region: 'Asia', search: 'West India' },
        countries: [
          {
            name: 'Goa',
            visible: true,
            cities: [
              { label: 'North Goa', search: 'North Goa', visible: true },
              { label: 'South Goa', search: 'South Goa', visible: true },
              { label: 'Panaji', search: 'Panaji', visible: true },
              { label: 'Dudhsagar', search: 'Dudhsagar', visible: true }
            ]
          },
          {
            name: 'Maharashtra',
            visible: true,
            cities: [
              { label: 'Mumbai', search: 'Mumbai', visible: true },
              { label: 'Lonavala & Khandala', search: 'Lonavala', visible: true },
              { label: 'Mahabaleshwar', search: 'Mahabaleshwar', visible: true },
              { label: 'Alibaug', search: 'Alibaug', visible: true },
              { label: 'Nashik', search: 'Nashik', visible: true }
            ]
          },
          {
            name: 'Gujarat',
            visible: true,
            cities: [
              { label: 'Rann of Kutch', search: 'Kutch', visible: true },
              { label: 'Gir National Park', search: 'Gir', visible: true },
              { label: 'Statue of Unity', search: 'Statue of Unity', visible: true },
              { label: 'Dwarka & Somnath', search: 'Dwarka', visible: true }
            ]
          },
          {
            name: 'Madhya Pradesh',
            visible: true,
            cities: [
              { label: 'Kanha & Bandhavgarh', search: 'Bandhavgarh', visible: true },
              { label: 'Khajuraho', search: 'Khajuraho', visible: true },
              { label: 'Bhopal & Sanchi', search: 'Bhopal', visible: true },
              { label: 'Gwalior', search: 'Gwalior', visible: true },
              { label: 'Ujjain & Indore', search: 'Ujjain', visible: true }
            ]
          }
        ]
      },
      {
        id: 'east-ne',
        name: 'East & North-East',
        visible: true,
        allLink: { label: 'All East & North-East', region: 'Asia', search: 'North East India' },
        countries: [
          {
            name: 'Sikkim',
            visible: true,
            cities: [
              { label: 'Gangtok', search: 'Gangtok', visible: true },
              { label: 'Pelling', search: 'Pelling', visible: true },
              { label: 'Lachen & Lachung', search: 'Lachung', visible: true },
              { label: 'Nathula Pass', search: 'Nathula', visible: true }
            ]
          },
          {
            name: 'West Bengal',
            visible: true,
            cities: [
              { label: 'Darjeeling', search: 'Darjeeling', visible: true },
              { label: 'Kolkata', search: 'Kolkata', visible: true },
              { label: 'Sundarbans', search: 'Sundarbans', visible: true },
              { label: 'Kalimpong', search: 'Kalimpong', visible: true }
            ]
          },
          {
            name: 'Meghalaya',
            visible: true,
            cities: [
              { label: 'Shillong', search: 'Shillong', visible: true },
              { label: 'Cherrapunji', search: 'Cherrapunji', visible: true },
              { label: 'Dawki', search: 'Dawki', visible: true }
            ]
          },
          {
            name: 'Assam',
            visible: true,
            cities: [
              { label: 'Guwahati', search: 'Guwahati', visible: true },
              { label: 'Kaziranga', search: 'Kaziranga', visible: true },
              { label: 'Majuli', search: 'Majuli', visible: true }
            ]
          },
          {
            name: 'Arunachal & Nagaland',
            visible: true,
            cities: [
              { label: 'Tawang', search: 'Tawang', visible: true },
              { label: 'Ziro Valley', search: 'Ziro', visible: true },
              { label: 'Kohima', search: 'Kohima', visible: true }
            ]
          },
          {
            name: 'Odisha',
            visible: true,
            cities: [
              { label: 'Puri', search: 'Puri', visible: true },
              { label: 'Bhubaneswar', search: 'Bhubaneswar', visible: true },
              { label: 'Chilika Lake', search: 'Chilika', visible: true }
            ]
          }
        ]
      },
      {
        id: 'islands',
        name: 'Islands & UTs',
        visible: true,
        allLink: { label: 'All Islands & UTs', region: 'Asia', search: 'Andaman' },
        countries: [
          {
            name: 'Andaman & Nicobar',
            visible: true,
            cities: [
              { label: 'Port Blair', search: 'Port Blair', visible: true },
              { label: 'Havelock Island', search: 'Havelock', visible: true },
              { label: 'Neil Island', search: 'Neil Island', visible: true },
              { label: 'Baratang', search: 'Baratang', visible: true }
            ]
          },
          {
            name: 'Lakshadweep',
            visible: true,
            cities: [
              { label: 'Agatti Island', search: 'Agatti', visible: true },
              { label: 'Bangaram Island', search: 'Bangaram', visible: true },
              { label: 'Kavaratti', search: 'Kavaratti', visible: true }
            ]
          },
          {
            name: 'Puducherry & Daman',
            visible: true,
            cities: [
              { label: 'Pondicherry', search: 'Pondicherry', visible: true },
              { label: 'Auroville', search: 'Auroville', visible: true },
              { label: 'Daman & Diu', search: 'Daman', visible: true }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'international',
    label: 'International',
    type: 'megamenu',
    isSplit: true,
    visible: true,
    topTabs: [
      { label: 'Top Recommended Destinations', continentId: 'europe' },
      { label: 'Europe', continentId: 'europe' },
      { label: 'South East Asia', continentId: 'asia' },
      { label: 'Australia New Zealand', continentId: 'australia' },
      { label: 'America', continentId: 'america' },
      { label: 'Africa', continentId: 'africa' },
      { label: 'Japan China Korea Taiwan', continentId: 'asia' },
    ],
    continents: [
      {
        id: 'africa',
        name: 'Africa',
        visible: true,
        allLink: { label: 'All of Africa', region: 'Africa', search: 'Africa' },
        countries: [
          {
            name: 'Egypt',
            visible: true,
            cities: [
              { label: 'Alexandria', search: 'Alexandria', visible: true },
              { label: 'Aswan', search: 'Aswan', visible: true },
              { label: 'Cairo', search: 'Cairo', visible: true },
              { label: 'Hurghada', search: 'Hurghada', visible: true },
              { label: 'Luxor', search: 'Luxor', visible: true },
              { label: 'Nile Cruise', search: 'Nile Cruise', visible: true }
            ]
          },
          {
            name: 'Kenya',
            visible: true,
            cities: [
              { label: 'Masai Mara', search: 'Masai Mara', visible: true }
            ]
          },
          {
            name: 'Mauritius',
            visible: true,
            cities: [
              { label: 'Port Louis', search: 'Port Louis', visible: true }
            ]
          },
          {
            name: 'Seychelles',
            visible: true,
            cities: []
          },
          {
            name: 'South Africa',
            visible: true,
            cities: [
              { label: 'Cape Town', search: 'Cape Town', visible: true },
              { label: 'George', search: 'George', visible: true },
              { label: 'Johannesburg', search: 'Johannesburg', visible: true },
              { label: 'Knysna', search: 'Knysna', visible: true },
              { label: 'Mossel Bay', search: 'Mossel Bay', visible: true },
              { label: 'Oudtshoorn', search: 'Oudtshoorn', visible: true },
              { label: 'Pilanesberg National Park', search: 'Pilanesberg', visible: true },
              { label: 'Port Elizabeth (Gqeberha)', search: 'Port Elizabeth', visible: true },
              { label: 'Stellenbosch', search: 'Stellenbosch', visible: true },
              { label: 'Sun City', search: 'Sun City', visible: true }
            ]
          },
          {
            name: 'Tanzania',
            visible: true,
            cities: []
          },
          {
            name: 'Zimbabwe',
            visible: true,
            cities: [
              { label: 'Victoria Falls', search: 'Victoria Falls', visible: true }
            ]
          }
        ]
      },
      {
        id: 'america',
        name: 'America',
        visible: true,
        allLink: { label: 'All of America', region: 'North America', search: 'America' },
        countries: [
          {
            name: 'USA',
            visible: true,
            cities: [
              { label: 'New York', search: 'New York', visible: true },
              { label: 'Los Angeles', search: 'Los Angeles', visible: true },
              { label: 'Las Vegas', search: 'Las Vegas', visible: true },
              { label: 'Orlando', search: 'Orlando', visible: true },
              { label: 'San Francisco', search: 'San Francisco', visible: true },
              { label: 'Miami', search: 'Miami', visible: true },
              { label: 'Hawaii', search: 'Hawaii', visible: true },
              { label: 'Alaska', search: 'Alaska', visible: true }
            ]
          },
          {
            name: 'Canada',
            visible: true,
            cities: [
              { label: 'Toronto', search: 'Toronto', visible: true },
              { label: 'Vancouver', search: 'Vancouver', visible: true },
              { label: 'Montreal', search: 'Montreal', visible: true },
              { label: 'Banff', search: 'Banff', visible: true }
            ]
          },
          {
            name: 'Mexico & Central America',
            visible: true,
            cities: [
              { label: 'Cancun', search: 'Cancun', visible: true },
              { label: 'Mexico City', search: 'Mexico City', visible: true },
              { label: 'Costa Rica', search: 'Costa Rica', visible: true },
              { label: 'Panama', search: 'Panama', visible: true }
            ]
          },
          {
            name: 'South America',
            visible: true,
            cities: [
              { label: 'Rio de Janeiro', search: 'Rio de Janeiro', visible: true },
              { label: 'Buenos Aires', search: 'Buenos Aires', visible: true },
              { label: 'Cusco (Machu Picchu)', search: 'Machu Picchu', visible: true },
              { label: 'Patagonia', search: 'Patagonia', visible: true }
            ]
          }
        ]
      },
      {
        id: 'asia',
        name: 'Asia',
        visible: true,
        allLink: { label: 'All of Asia', region: 'Asia', search: 'Asia' },
        countries: [
          {
            name: 'Thailand',
            visible: true,
            cities: [
              { label: 'Bangkok', search: 'Bangkok', visible: true },
              { label: 'Phuket', search: 'Phuket', visible: true },
              { label: 'Pattaya', search: 'Pattaya', visible: true },
              { label: 'Chiang Mai', search: 'Chiang Mai', visible: true },
              { label: 'Krabi', search: 'Krabi', visible: true }
            ]
          },
          {
            name: 'Indonesia (Bali)',
            visible: true,
            cities: [
              { label: 'Ubud', search: 'Ubud', visible: true },
              { label: 'Seminyak', search: 'Seminyak', visible: true },
              { label: 'Nusa Penida', search: 'Nusa Penida', visible: true },
              { label: 'Kuta', search: 'Kuta', visible: true }
            ]
          },
          {
            name: 'Vietnam & Cambodia',
            visible: true,
            cities: [
              { label: 'Hanoi', search: 'Hanoi', visible: true },
              { label: 'Ha Long Bay', search: 'Ha Long', visible: true },
              { label: 'Da Nang', search: 'Da Nang', visible: true },
              { label: 'Siem Reap', search: 'Siem Reap', visible: true }
            ]
          },
          {
            name: 'Singapore & Malaysia',
            visible: true,
            cities: [
              { label: 'Singapore', search: 'Singapore', visible: true },
              { label: 'Kuala Lumpur', search: 'Kuala Lumpur', visible: true },
              { label: 'Langkawi', search: 'Langkawi', visible: true },
              { label: 'Penang', search: 'Penang', visible: true }
            ]
          },
          {
            name: 'Japan & East Asia',
            visible: true,
            cities: [
              { label: 'Tokyo', search: 'Tokyo', visible: true },
              { label: 'Kyoto', search: 'Kyoto', visible: true },
              { label: 'Osaka', search: 'Osaka', visible: true },
              { label: 'Seoul', search: 'Seoul', visible: true },
              { label: 'Beijing', search: 'Beijing', visible: true },
              { label: 'Hong Kong', search: 'Hong Kong', visible: true },
              { label: 'Taipei', search: 'Taipei', visible: true }
            ]
          },
          {
            name: 'South Asia & Island Havens',
            visible: true,
            cities: [
              { label: 'Sri Lanka', search: 'Sri Lanka', visible: true },
              { label: 'Maldives', search: 'Maldives', visible: true },
              { label: 'Nepal', search: 'Nepal', visible: true },
              { label: 'Bhutan', search: 'Bhutan', visible: true }
            ]
          }
        ]
      },
      {
        id: 'australia',
        name: 'Australia & New Zealand',
        visible: true,
        allLink: { label: 'All of Australia & NZ', region: 'Australia', search: 'Australia' },
        countries: [
          {
            name: 'Australia',
            visible: true,
            cities: [
              { label: 'Sydney', search: 'Sydney', visible: true },
              { label: 'Melbourne', search: 'Melbourne', visible: true },
              { label: 'Gold Coast', search: 'Gold Coast', visible: true },
              { label: 'Cairns & Reef', search: 'Cairns', visible: true },
              { label: 'Perth', search: 'Perth', visible: true }
            ]
          },
          {
            name: 'New Zealand',
            visible: true,
            cities: [
              { label: 'Auckland', search: 'Auckland', visible: true },
              { label: 'Queenstown', search: 'Queenstown', visible: true },
              { label: 'Christchurch', search: 'Christchurch', visible: true },
              { label: 'Rotorua', search: 'Rotorua', visible: true }
            ]
          },
          {
            name: 'Pacific Islands',
            visible: true,
            cities: [
              { label: 'Fiji', search: 'Fiji', visible: true },
              { label: 'Bora Bora', search: 'Bora Bora', visible: true },
              { label: 'Tahiti', search: 'Tahiti', visible: true }
            ]
          }
        ]
      },
      {
        id: 'europe',
        name: 'Europe',
        visible: true,
        allLink: { label: 'All of Europe', region: 'Europe', search: 'Europe' },
        countries: [
          {
            name: 'Switzerland & Alps',
            visible: true,
            cities: [
              { label: 'Zurich', search: 'Zurich', visible: true },
              { label: 'Geneva', search: 'Geneva', visible: true },
              { label: 'Interlaken', search: 'Interlaken', visible: true },
              { label: 'Lucerne', search: 'Lucerne', visible: true },
              { label: 'Zermatt', search: 'Zermatt', visible: true }
            ]
          },
          {
            name: 'France',
            visible: true,
            cities: [
              { label: 'Paris', search: 'Paris', visible: true },
              { label: 'Nice', search: 'Nice', visible: true },
              { label: 'Lyon', search: 'Lyon', visible: true },
              { label: 'French Riviera', search: 'French Riviera', visible: true }
            ]
          },
          {
            name: 'Italy',
            visible: true,
            cities: [
              { label: 'Rome', search: 'Rome', visible: true },
              { label: 'Florence', search: 'Florence', visible: true },
              { label: 'Venice', search: 'Venice', visible: true },
              { label: 'Milan', search: 'Milan', visible: true },
              { label: 'Amalfi Coast', search: 'Amalfi', visible: true },
              { label: 'Tuscany', search: 'Tuscany', visible: true }
            ]
          },
          {
            name: 'Spain & Portugal',
            visible: true,
            cities: [
              { label: 'Barcelona', search: 'Barcelona', visible: true },
              { label: 'Madrid', search: 'Madrid', visible: true },
              { label: 'Seville', search: 'Seville', visible: true },
              { label: 'Ibiza', search: 'Ibiza', visible: true },
              { label: 'Lisbon', search: 'Lisbon', visible: true }
            ]
          },
          {
            name: 'United Kingdom & Ireland',
            visible: true,
            cities: [
              { label: 'London', search: 'London', visible: true },
              { label: 'Edinburgh', search: 'Edinburgh', visible: true },
              { label: 'Highlands', search: 'Scotland', visible: true },
              { label: 'Dublin', search: 'Dublin', visible: true }
            ]
          },
          {
            name: 'Greece & Turkey',
            visible: true,
            cities: [
              { label: 'Athens', search: 'Athens', visible: true },
              { label: 'Santorini', search: 'Santorini', visible: true },
              { label: 'Mykonos', search: 'Mykonos', visible: true },
              { label: 'Istanbul', search: 'Istanbul', visible: true },
              { label: 'Cappadocia', search: 'Cappadocia', visible: true }
            ]
          },
          {
            name: 'Nordics & Iceland',
            visible: true,
            cities: [
              { label: 'Reykjavik', search: 'Reykjavik', visible: true },
              { label: 'Oslo', search: 'Oslo', visible: true },
              { label: 'Stockholm', search: 'Stockholm', visible: true },
              { label: 'Copenhagen', search: 'Copenhagen', visible: true },
              { label: 'Lapland', search: 'Lapland', visible: true }
            ]
          }
        ]
      },
      {
        id: 'middle_east',
        name: 'Middle East',
        visible: true,
        allLink: { label: 'All of Middle East', region: 'Asia', search: 'Middle East' },
        countries: [
          {
            name: 'United Arab Emirates',
            visible: true,
            cities: [
              { label: 'Dubai', search: 'Dubai', visible: true },
              { label: 'Abu Dhabi', search: 'Abu Dhabi', visible: true },
              { label: 'Sharjah', search: 'Sharjah', visible: true },
              { label: 'Ras Al Khaimah', search: 'Ras Al Khaimah', visible: true }
            ]
          },
          {
            name: 'Oman & Jordan',
            visible: true,
            cities: [
              { label: 'Muscat', search: 'Muscat', visible: true },
              { label: 'Salalah', search: 'Salalah', visible: true },
              { label: 'Petra', search: 'Petra', visible: true },
              { label: 'Amman', search: 'Amman', visible: true },
              { label: 'Dead Sea', search: 'Dead Sea', visible: true }
            ]
          },
          {
            name: 'Saudi Arabia & Qatar',
            visible: true,
            cities: [
              { label: 'Riyadh', search: 'Riyadh', visible: true },
              { label: 'Jeddah', search: 'Jeddah', visible: true },
              { label: 'AlUla', search: 'AlUla', visible: true },
              { label: 'Doha', search: 'Doha', visible: true }
            ]
          },
          {
            name: 'Georgia & Caucasus',
            visible: true,
            cities: [
              { label: 'Tbilisi', search: 'Tbilisi', visible: true },
              { label: 'Batumi', search: 'Batumi', visible: true },
              { label: 'Baku', search: 'Baku', visible: true },
              { label: 'Yerevan', search: 'Yerevan', visible: true }
            ]
          }
        ]
      },
      {
        id: 'antarctica',
        name: 'Antarctica',
        visible: true,
        allLink: { label: 'All Expeditions', region: 'Antarctica', search: 'Antarctica' },
        countries: [
          {
            name: 'Antarctica Voyages',
            visible: true,
            cities: [
              { label: 'Antarctica Expedition', search: 'Antarctica', visible: true },
              { label: 'South Georgia Island', search: 'South Georgia', visible: true },
              { label: 'Falkland Islands', search: 'Falkland', visible: true },
              { label: 'Antarctic Peninsula', search: 'Antarctic Peninsula', visible: true },
              { label: 'Ross Sea Explorer', search: 'Ross Sea', visible: true }
            ]
          },
          {
            name: 'Arctic & Polar Expeditions',
            visible: true,
            cities: [
              { label: 'Svalbard', search: 'Svalbard', visible: true },
              { label: 'Greenland', search: 'Greenland', visible: true },
              { label: 'North Pole Expedition', search: 'North Pole', visible: true }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'group_tours',
    label: 'Group Tours',
    type: 'dropdown',
    visible: true,
    tourHighlights: [
      { id: 'th-1', title: 'Vietnam Group tour', region: 'Asia', destination: 'Vietnam', active: true },
      { id: 'th-2', title: 'Aegean Blue Santorini & Mykonos Cruise — Sep 2026', region: 'Europe', destination: 'Greece', active: true },
      { id: 'th-3', title: 'Swiss Alps Autumn Panorama — Oct 2026 Batch', region: 'Europe', destination: 'Switzerland', active: true },
      { id: 'th-4', title: 'Kashmir Autumn Houseboat & Snow Valley — Oct 2026', region: 'India', destination: 'Kashmir', active: true },
      { id: 'th-5', title: 'Great Migration Safari Expedition — Nov 2026', region: 'Africa', destination: 'Safari', active: true },
      { id: 'th-6', title: 'Vietnam Heritage & Ha Long Bay Cruise — Nov 2026 Batch', region: 'Asia', destination: 'Vietnam', active: true },
      { id: 'th-7', title: 'Bali Tropical Escape & Nusa Penida', region: 'Asia', destination: 'Bali', active: true },
      { id: 'th-8', title: 'Serengeti & Masai Mara Wildlife Safari', region: 'Africa', destination: 'Masai Mara', active: true }
    ],
    columns: [
      {
        heading: 'Popular Group Expeditions',
        links: [
          { label: 'Vietnam Group tour', page: 'destinations', region: 'Asia', search: 'Vietnam' },
          { label: 'Aegean Blue Santorini & Mykonos Cruise — Sep 2026', page: 'destinations', region: 'Europe', search: 'Greece' },
          { label: 'Swiss Alps Autumn Panorama — Oct 2026 Batch', page: 'destinations', region: 'Europe', search: 'Switzerland' },
          { label: 'Kashmir Autumn Houseboat & Snow Valley — Oct 2026', page: 'destinations', region: 'India', search: 'Kashmir' },
          { label: 'Great Migration Safari Expedition — Nov 2026', page: 'destinations', region: 'Africa', search: 'Safari' },
          { label: 'Vietnam Heritage & Ha Long Bay Cruise — Nov 2026 Batch', page: 'destinations', region: 'Asia', search: 'Vietnam' },
          { label: 'Bali Tropical Escape & Nusa Penida', page: 'destinations', region: 'Asia', search: 'Bali' },
          { label: 'Serengeti & Masai Mara Wildlife Safari', page: 'destinations', region: 'Africa', search: 'Masai Mara' }
        ]
      }
    ]
  },
  {
    id: 'corporate',
    label: 'Corporate Travel',
    type: 'link',
    page: 'corporate',
    visible: true
  },
  {
    id: 'gallery',
    label: 'Stories & Gallery',
    type: 'link',
    page: 'gallery',
    visible: true
  },
  {
    id: 'giftcards',
    label: 'Gift Cards',
    type: 'link',
    page: 'giftcards',
    visible: false
  }
];
