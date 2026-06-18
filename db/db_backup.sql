--
-- PostgreSQL database dump
--


-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id character varying(50) NOT NULL,
    client_name character varying(255) NOT NULL,
    client_id character varying(50),
    package_name character varying(255) NOT NULL,
    package_id character varying(50),
    amount character varying(50) NOT NULL,
    departure_date date NOT NULL,
    status character varying(50) DEFAULT 'Pending'::character varying,
    agent character varying(100),
    guests integer DEFAULT 1,
    notes text,
    start_date date,
    end_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(50),
    status character varying(50) DEFAULT 'Active'::character varying,
    tier character varying(50) DEFAULT 'Silver'::character varying,
    historical_ltv numeric DEFAULT 0,
    historical_bookings_count integer DEFAULT 0,
    avatar text,
    preferences jsonb,
    passport jsonb,
    visa jsonb,
    emergency_contact jsonb,
    wallet_balance character varying(50) DEFAULT '$0.00'::character varying,
    notes text,
    last_contact character varying(50),
    logs jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packages (
    id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    duration character varying(50) NOT NULL,
    base_price numeric NOT NULL,
    region character varying(100) NOT NULL,
    slots_booked integer DEFAULT 0,
    slots_total integer NOT NULL,
    trend character varying(100),
    color character varying(100),
    inclusions_selection jsonb,
    hero_image text,
    card_image text,
    description text,
    highlights text[],
    inclusions text[],
    exclusions text[],
    itinerary jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    best_month character varying(50),
    cta_badge character varying(100)
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    key character varying(50) NOT NULL,
    value jsonb NOT NULL
);


--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.testimonials (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    location character varying(255),
    avatar text,
    rating integer,
    text text,
    package character varying(255)
);


--
-- Name: testimonials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.testimonials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: testimonials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.testimonials_id_seq OWNED BY public.testimonials.id;


--
-- Name: testimonials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials ALTER COLUMN id SET DEFAULT nextval('public.testimonials_id_seq'::regclass);


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.clients (id, name, email, phone, status, tier, historical_ltv, historical_bookings_count, avatar, preferences, passport, visa, emergency_contact, wallet_balance, notes, last_contact, logs, created_at) VALUES ('C-9e74c630-9a6f-4ccd-aac3-e82f58e8223f', 'John Doe', 'john.doe@example.com', '+15551234567', 'Active', 'Silver', 0, 1, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80', '{"room": "Standard King", "seat": "Window", "airline": "Standard Carrier", "dietary": "None"}', '{"number": "Pending", "status": "Valid", "expires": "Pending"}', '{"class": "Tourist", "country": "Pending", "expires": "Pending"}', '{"name": "Not Listed", "phone": "Not Listed", "relation": "Not Listed"}', '$0.00', 'Online inquiry submitted.', '2026-06-18', '[{"text": "System: Deleted booking BK-89e886f8-90ae-4f8e-83f2-2249a571d47c for package \"Custom Tour to Switzerland Luxury Tour\"", "time": "2026-06-18 11:04"}, {"text": "System: Deleted booking BK-89e886f8-90ae-4f8e-83f2-2249a571d47c for package \"Custom Tour to Switzerland Luxury Tour\"", "time": "2026-06-18 11:04"}, {"text": "System: Submitted online inquiry for \"Custom Tour to Switzerland Luxury Tour\" (Booking ID: BK-89e886f8-90ae-4f8e-83f2-2249a571d47c, Guests: 4)", "time": "2026-06-18 11:02"}, {"text": "System: Client profile initialized from online inquiry", "time": "2026-06-18 11:02"}]', '2026-06-18 16:32:22.026145');
INSERT INTO public.clients (id, name, email, phone, status, tier, historical_ltv, historical_bookings_count, avatar, preferences, passport, visa, emergency_contact, wallet_balance, notes, last_contact, logs, created_at) VALUES ('C-64b1d7cb-fa2c-4b7d-a764-48aeba3e2e35', 'Parth', 'pcmyfake@gmail.com', '952938265', 'Active', 'Silver', 0, 1, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80', '{"room": "Standard King", "seat": "Window", "airline": "Standard Carrier", "dietary": "None"}', '{"number": "Pending", "status": "Valid", "expires": "Pending"}', '{"class": "Tourist", "country": "Pending", "expires": "Pending"}', '{"name": "Not Listed", "phone": "Not Listed", "relation": "Not Listed"}', '$0.00', 'Online inquiry submitted.', '2026-06-18', '[{"text": "System: Deleted booking BK-234d23c8-fc49-43dd-8b12-08fb7fbf5f0c for package \"Custom Tour to Asia\"", "time": "2026-06-18 11:04"}, {"text": "System: Deleted booking BK-234d23c8-fc49-43dd-8b12-08fb7fbf5f0c for package \"Custom Tour to Asia\"", "time": "2026-06-18 11:04"}, {"text": "System: Submitted online inquiry for \"Custom Tour to Asia\" (Booking ID: BK-234d23c8-fc49-43dd-8b12-08fb7fbf5f0c, Guests: 2)", "time": "2026-06-18 11:04"}, {"text": "System: Client profile initialized from online inquiry", "time": "2026-06-18 11:04"}]', '2026-06-18 16:34:13.882194');


--
-- Data for Name: packages; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.packages (id, name, duration, base_price, region, slots_booked, slots_total, trend, color, inclusions_selection, hero_image, card_image, description, highlights, inclusions, exclusions, itinerary, created_at, best_month, cta_badge) VALUES ('PKG-add20454-046b-4427-9f8d-40cc18b48a2d', 'Swiss Alpine Luxury', '5 Days', 245000, 'Europe', 0, 10, 'New', 'bg-stone-100 text-stone-850 border-stone-200', '{"guide": true, "hotel": true, "flight": false, "sightseeing": true, "airportTransfer": true}', 'http://localhost:5000/assets/1781783403129-582643985.png', 'http://localhost:5000/assets/1781783399446-809193766.png', 'A breathtaking journey through the Swiss Alps featuring stays in world-class chalets and scenic glacier express rides.', '{"Glacier Express","Zermatt Matterhorn","Luxury Chalet Stay"}', '{}', '{}', '[]', '2026-06-18 16:35:57.212701', NULL, NULL);
INSERT INTO public.packages (id, name, duration, base_price, region, slots_booked, slots_total, trend, color, inclusions_selection, hero_image, card_image, description, highlights, inclusions, exclusions, itinerary, created_at, best_month, cta_badge) VALUES ('PKG-962d67ba-9fce-4f66-b5b6-d78f98ba126c', 'Safari Adventure Kenya', '7 Days / 6 Nights', 180000, 'Africa', 0, 8, 'New', 'bg-stone-100 text-stone-850 border-stone-200', '{"guide": true, "hotel": true, "flight": false, "sightseeing": true, "airportTransfer": true}', 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=600&q=80', 'Witness the Great Migration and stay in premium eco-lodges right in the heart of the Masai Mara.', '{"Masai Mara Safari","Hot Air Balloon Ride","Eco-Lodge Experience"}', '{}', '{}', '[]', '2026-06-18 16:35:57.218648', NULL, NULL);
INSERT INTO public.packages (id, name, duration, base_price, region, slots_booked, slots_total, trend, color, inclusions_selection, hero_image, card_image, description, highlights, inclusions, exclusions, itinerary, created_at, best_month, cta_badge) VALUES ('PKG-9d85a90d-5aae-4959-a179-4ddd2f276232', 'Mystic Bali Escape', '6 Days / 5 Nights', 85000, 'Asia', 0, 12, 'New', 'bg-stone-100 text-stone-850 border-stone-200', '{"guide": true, "hotel": true, "flight": true, "sightseeing": true, "airportTransfer": true}', 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80', 'Experience the spiritual and natural beauty of Bali with exclusive access to secluded temples and private beach villas.', '{"Ubud Sacred Monkey Forest","Tegallalang Rice Terrace","Private Beach Dinner"}', '{}', '{}', '[]', '2026-06-18 16:35:57.194896', 'October', 'Early Bird Deal');


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.settings (key, value) VALUES ('agency_settings', '{"apis": null, "agencyName": "", "agencyEmail": "", "agencyPhone": "", "permissions": null, "agencyAddress": "", "defaultMarkup": 15, "specialOffers": [], "defaultAgentSplit": 40}');
INSERT INTO public.settings (key, value) VALUES ('weather_cache', '{"updatedAt": "2026-06-18T11:28:09.081Z", "destinations": {"Asia": {"city": "Bangkok", "months": [{"month": "Jan", "avgLow": 22, "rainMm": 0, "avgHigh": 33}, {"month": "Feb", "avgLow": 24, "rainMm": 59, "avgHigh": 34}, {"month": "Mar", "avgLow": 26, "rainMm": 62, "avgHigh": 35}, {"month": "Apr", "avgLow": 27, "rainMm": 88, "avgHigh": 35}, {"month": "May", "avgLow": 26, "rainMm": 257, "avgHigh": 32}, {"month": "Jun", "avgLow": 26, "rainMm": 184, "avgHigh": 32}, {"month": "Jul", "avgLow": 26, "rainMm": 217, "avgHigh": 31}, {"month": "Aug", "avgLow": 25, "rainMm": 184, "avgHigh": 32}, {"month": "Sep", "avgLow": 25, "rainMm": 263, "avgHigh": 31}, {"month": "Oct", "avgLow": 25, "rainMm": 190, "avgHigh": 32}, {"month": "Nov", "avgLow": 23, "rainMm": 162, "avgHigh": 30}, {"month": "Dec", "avgLow": 23, "rainMm": 9, "avgHigh": 32}]}, "Africa": {"city": "Nairobi", "months": [{"month": "Jan", "avgLow": 15, "rainMm": 51, "avgHigh": 27}, {"month": "Feb", "avgLow": 16, "rainMm": 8, "avgHigh": 28}, {"month": "Mar", "avgLow": 16, "rainMm": 87, "avgHigh": 27}, {"month": "Apr", "avgLow": 16, "rainMm": 117, "avgHigh": 25}, {"month": "May", "avgLow": 15, "rainMm": 141, "avgHigh": 24}, {"month": "Jun", "avgLow": 14, "rainMm": 46, "avgHigh": 24}, {"month": "Jul", "avgLow": 14, "rainMm": 15, "avgHigh": 24}, {"month": "Aug", "avgLow": 13, "rainMm": 60, "avgHigh": 23}, {"month": "Sep", "avgLow": 14, "rainMm": 16, "avgHigh": 27}, {"month": "Oct", "avgLow": 15, "rainMm": 83, "avgHigh": 26}, {"month": "Nov", "avgLow": 15, "rainMm": 69, "avgHigh": 25}, {"month": "Dec", "avgLow": 15, "rainMm": 78, "avgHigh": 26}]}, "Europe": {"city": "Paris", "months": [{"month": "Jan", "avgLow": 1, "rainMm": 137, "avgHigh": 7}, {"month": "Feb", "avgLow": 2, "rainMm": 50, "avgHigh": 8}, {"month": "Mar", "avgLow": 4, "rainMm": 22, "avgHigh": 13}, {"month": "Apr", "avgLow": 8, "rainMm": 29, "avgHigh": 19}, {"month": "May", "avgLow": 11, "rainMm": 57, "avgHigh": 21}, {"month": "Jun", "avgLow": 16, "rainMm": 58, "avgHigh": 27}, {"month": "Jul", "avgLow": 16, "rainMm": 142, "avgHigh": 25}, {"month": "Aug", "avgLow": 15, "rainMm": 23, "avgHigh": 26}, {"month": "Sep", "avgLow": 12, "rainMm": 60, "avgHigh": 20}, {"month": "Oct", "avgLow": 10, "rainMm": 43, "avgHigh": 16}, {"month": "Nov", "avgLow": 6, "rainMm": 82, "avgHigh": 11}, {"month": "Dec", "avgLow": 4, "rainMm": 37, "avgHigh": 9}]}, "Kerala": {"city": "Kochi", "months": [{"month": "Jan", "avgLow": 24, "rainMm": 12, "avgHigh": 32}, {"month": "Feb", "avgLow": 25, "rainMm": 12, "avgHigh": 32}, {"month": "Mar", "avgLow": 25, "rainMm": 109, "avgHigh": 32}, {"month": "Apr", "avgLow": 25, "rainMm": 163, "avgHigh": 31}, {"month": "May", "avgLow": 25, "rainMm": 593, "avgHigh": 30}, {"month": "Jun", "avgLow": 24, "rainMm": 512, "avgHigh": 29}, {"month": "Jul", "avgLow": 24, "rainMm": 519, "avgHigh": 28}, {"month": "Aug", "avgLow": 24, "rainMm": 439, "avgHigh": 28}, {"month": "Sep", "avgLow": 24, "rainMm": 243, "avgHigh": 28}, {"month": "Oct", "avgLow": 24, "rainMm": 247, "avgHigh": 29}, {"month": "Nov", "avgLow": 24, "rainMm": 78, "avgHigh": 30}, {"month": "Dec", "avgLow": 23, "rainMm": 28, "avgHigh": 31}]}, "America": {"city": "New York", "months": [{"month": "Jan", "avgLow": -5, "rainMm": 30, "avgHigh": 1}, {"month": "Feb", "avgLow": -3, "rainMm": 79, "avgHigh": 4}, {"month": "Mar", "avgLow": 2, "rainMm": 163, "avgHigh": 13}, {"month": "Apr", "avgLow": 7, "rainMm": 73, "avgHigh": 17}, {"month": "May", "avgLow": 13, "rainMm": 201, "avgHigh": 21}, {"month": "Jun", "avgLow": 19, "rainMm": 75, "avgHigh": 29}, {"month": "Jul", "avgLow": 22, "rainMm": 111, "avgHigh": 32}, {"month": "Aug", "avgLow": 18, "rainMm": 24, "avgHigh": 28}, {"month": "Sep", "avgLow": 17, "rainMm": 120, "avgHigh": 26}, {"month": "Oct", "avgLow": 10, "rainMm": 110, "avgHigh": 18}, {"month": "Nov", "avgLow": 4, "rainMm": 50, "avgHigh": 11}, {"month": "Dec", "avgLow": -4, "rainMm": 80, "avgHigh": 3}]}, "Andaman": {"city": "Port Blair", "months": [{"month": "Jan", "avgLow": 24, "rainMm": 48, "avgHigh": 29}, {"month": "Feb", "avgLow": 23, "rainMm": 44, "avgHigh": 30}, {"month": "Mar", "avgLow": 24, "rainMm": 31, "avgHigh": 32}, {"month": "Apr", "avgLow": 24, "rainMm": 302, "avgHigh": 30}, {"month": "May", "avgLow": 25, "rainMm": 357, "avgHigh": 30}, {"month": "Jun", "avgLow": 25, "rainMm": 411, "avgHigh": 29}, {"month": "Jul", "avgLow": 25, "rainMm": 247, "avgHigh": 30}, {"month": "Aug", "avgLow": 24, "rainMm": 413, "avgHigh": 29}, {"month": "Sep", "avgLow": 24, "rainMm": 441, "avgHigh": 29}, {"month": "Oct", "avgLow": 24, "rainMm": 351, "avgHigh": 29}, {"month": "Nov", "avgLow": 24, "rainMm": 137, "avgHigh": 29}, {"month": "Dec", "avgLow": 24, "rainMm": 68, "avgHigh": 29}]}, "Maldives": {"city": "Malé", "months": [{"month": "Jan", "avgLow": 26, "rainMm": 495, "avgHigh": 28}, {"month": "Feb", "avgLow": 27, "rainMm": 65, "avgHigh": 28}, {"month": "Mar", "avgLow": 27, "rainMm": 249, "avgHigh": 29}, {"month": "Apr", "avgLow": 27, "rainMm": 96, "avgHigh": 29}, {"month": "May", "avgLow": 27, "rainMm": 193, "avgHigh": 30}, {"month": "Jun", "avgLow": 28, "rainMm": 62, "avgHigh": 29}, {"month": "Jul", "avgLow": 27, "rainMm": 152, "avgHigh": 29}, {"month": "Aug", "avgLow": 27, "rainMm": 59, "avgHigh": 29}, {"month": "Sep", "avgLow": 27, "rainMm": 66, "avgHigh": 29}, {"month": "Oct", "avgLow": 27, "rainMm": 324, "avgHigh": 29}, {"month": "Nov", "avgLow": 27, "rainMm": 248, "avgHigh": 28}, {"month": "Dec", "avgLow": 26, "rainMm": 183, "avgHigh": 28}]}, "Leh Ladakh": {"city": "Leh", "months": [{"month": "Jan", "avgLow": -15, "rainMm": 39, "avgHigh": -3}, {"month": "Feb", "avgLow": -15, "rainMm": 52, "avgHigh": -3}, {"month": "Mar", "avgLow": -11, "rainMm": 23, "avgHigh": 0}, {"month": "Apr", "avgLow": -3, "rainMm": 22, "avgHigh": 8}, {"month": "May", "avgLow": 3, "rainMm": 23, "avgHigh": 16}, {"month": "Jun", "avgLow": 8, "rainMm": 28, "avgHigh": 22}, {"month": "Jul", "avgLow": 12, "rainMm": 37, "avgHigh": 24}, {"month": "Aug", "avgLow": 11, "rainMm": 73, "avgHigh": 22}, {"month": "Sep", "avgLow": 8, "rainMm": 36, "avgHigh": 19}, {"month": "Oct", "avgLow": -1, "rainMm": 14, "avgHigh": 10}, {"month": "Nov", "avgLow": -4, "rainMm": 0, "avgHigh": 6}, {"month": "Dec", "avgLow": -6, "rainMm": 8, "avgHigh": 2}]}, "North East": {"city": "Guwahati", "months": [{"month": "Jan", "avgLow": 13, "rainMm": 18, "avgHigh": 24}, {"month": "Feb", "avgLow": 13, "rainMm": 20, "avgHigh": 25}, {"month": "Mar", "avgLow": 17, "rainMm": 32, "avgHigh": 29}, {"month": "Apr", "avgLow": 21, "rainMm": 120, "avgHigh": 31}, {"month": "May", "avgLow": 22, "rainMm": 497, "avgHigh": 30}, {"month": "Jun", "avgLow": 25, "rainMm": 334, "avgHigh": 32}, {"month": "Jul", "avgLow": 25, "rainMm": 433, "avgHigh": 32}, {"month": "Aug", "avgLow": 25, "rainMm": 430, "avgHigh": 31}, {"month": "Sep", "avgLow": 25, "rainMm": 221, "avgHigh": 32}, {"month": "Oct", "avgLow": 23, "rainMm": 136, "avgHigh": 31}, {"month": "Nov", "avgLow": 18, "rainMm": 36, "avgHigh": 28}, {"month": "Dec", "avgLow": 13, "rainMm": 7, "avgHigh": 24}]}, "Japan & China": {"city": "Tokyo", "months": [{"month": "Jan", "avgLow": 1, "rainMm": 34, "avgHigh": 10}, {"month": "Feb", "avgLow": 2, "rainMm": 11, "avgHigh": 11}, {"month": "Mar", "avgLow": 5, "rainMm": 155, "avgHigh": 15}, {"month": "Apr", "avgLow": 11, "rainMm": 146, "avgHigh": 20}, {"month": "May", "avgLow": 15, "rainMm": 255, "avgHigh": 23}, {"month": "Jun", "avgLow": 21, "rainMm": 134, "avgHigh": 29}, {"month": "Jul", "avgLow": 25, "rainMm": 86, "avgHigh": 33}, {"month": "Aug", "avgLow": 26, "rainMm": 48, "avgHigh": 35}, {"month": "Sep", "avgLow": 23, "rainMm": 228, "avgHigh": 30}, {"month": "Oct", "avgLow": 15, "rainMm": 160, "avgHigh": 21}, {"month": "Nov", "avgLow": 8, "rainMm": 23, "avgHigh": 16}, {"month": "Dec", "avgLow": 3, "rainMm": 42, "avgHigh": 12}]}, "Jammu & Kashmir": {"city": "Srinagar", "months": [{"month": "Jan", "avgLow": -8, "rainMm": 110, "avgHigh": 5}, {"month": "Feb", "avgLow": -6, "rainMm": 309, "avgHigh": 7}, {"month": "Mar", "avgLow": -3, "rainMm": 193, "avgHigh": 12}, {"month": "Apr", "avgLow": 6, "rainMm": 111, "avgHigh": 22}, {"month": "May", "avgLow": 11, "rainMm": 36, "avgHigh": 26}, {"month": "Jun", "avgLow": 15, "rainMm": 67, "avgHigh": 30}, {"month": "Jul", "avgLow": 18, "rainMm": 174, "avgHigh": 29}, {"month": "Aug", "avgLow": 17, "rainMm": 152, "avgHigh": 29}, {"month": "Sep", "avgLow": 14, "rainMm": 92, "avgHigh": 28}, {"month": "Oct", "avgLow": 7, "rainMm": 45, "avgHigh": 22}, {"month": "Nov", "avgLow": 0, "rainMm": 10, "avgHigh": 15}, {"month": "Dec", "avgLow": 0, "rainMm": 75, "avgHigh": 12}]}, "South East Asia": {"city": "Bali", "months": [{"month": "Jan", "avgLow": 21, "rainMm": 505, "avgHigh": 26}, {"month": "Feb", "avgLow": 21, "rainMm": 318, "avgHigh": 27}, {"month": "Mar", "avgLow": 22, "rainMm": 290, "avgHigh": 27}, {"month": "Apr", "avgLow": 21, "rainMm": 127, "avgHigh": 26}, {"month": "May", "avgLow": 21, "rainMm": 449, "avgHigh": 26}, {"month": "Jun", "avgLow": 21, "rainMm": 138, "avgHigh": 25}, {"month": "Jul", "avgLow": 20, "rainMm": 234, "avgHigh": 24}, {"month": "Aug", "avgLow": 20, "rainMm": 170, "avgHigh": 24}, {"month": "Sep", "avgLow": 20, "rainMm": 218, "avgHigh": 25}, {"month": "Oct", "avgLow": 21, "rainMm": 246, "avgHigh": 26}, {"month": "Nov", "avgLow": 21, "rainMm": 360, "avgHigh": 26}, {"month": "Dec", "avgLow": 21, "rainMm": 255, "avgHigh": 27}]}}}');


--
-- Data for Name: testimonials; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: testimonials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.testimonials_id_seq', 1, false);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: clients clients_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_email_key UNIQUE (email);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--


