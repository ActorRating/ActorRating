--
-- PostgreSQL database dump
--

\restrict atPFgWBMciISBqNdMVDbeb5JSw6WMNZB71ENZPspSxSUZEzrhxwJQbWEWaBrReR

-- Dumped from database version 15.13 (Homebrew)
-- Dumped by pg_dump version 15.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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
-- Name: Account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


ALTER TABLE public."Account" OWNER TO postgres;

--
-- Name: Actor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Actor" (
    id text NOT NULL,
    name text NOT NULL,
    bio text,
    "imageUrl" text,
    "birthDate" timestamp(3) without time zone,
    nationality text,
    "tmdbId" integer,
    "knownFor" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Actor" OWNER TO postgres;

--
-- Name: Movie; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Movie" (
    id text NOT NULL,
    title text NOT NULL,
    year integer NOT NULL,
    director text,
    genre text,
    "tmdbId" integer,
    overview text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Movie" OWNER TO postgres;

--
-- Name: Performance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Performance" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "actorId" text NOT NULL,
    "movieId" text NOT NULL,
    "emotionalRangeDepth" smallint NOT NULL,
    "characterBelievability" smallint NOT NULL,
    "technicalSkill" smallint NOT NULL,
    "screenPresence" smallint NOT NULL,
    "chemistryInteraction" smallint NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Performance" OWNER TO postgres;

--
-- Name: RateLimit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RateLimit" (
    id text NOT NULL,
    ip text NOT NULL,
    action text NOT NULL,
    count integer DEFAULT 1 NOT NULL,
    "windowStart" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RateLimit" OWNER TO postgres;

--
-- Name: Rating; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Rating" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "actorId" text NOT NULL,
    "movieId" text NOT NULL,
    slug text,
    "emotionalRangeDepth" smallint NOT NULL,
    "characterBelievability" smallint NOT NULL,
    "technicalSkill" smallint NOT NULL,
    "screenPresence" smallint NOT NULL,
    "chemistryInteraction" smallint NOT NULL,
    "weightedScore" double precision DEFAULT 0 NOT NULL,
    "shareScore" smallint,
    "roleName" text,
    breakdown jsonb,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Rating" OWNER TO postgres;

--
-- Name: ServerEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ServerEvent" (
    id text NOT NULL,
    type text NOT NULL,
    "ratingId" text,
    payload jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ServerEvent" OWNER TO postgres;

--
-- Name: Session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Session" OWNER TO postgres;

--
-- Name: ShareClick; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ShareClick" (
    id text NOT NULL,
    "shortLinkId" text NOT NULL,
    referer text,
    "userAgent" text,
    "ipHash" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ShareClick" OWNER TO postgres;

--
-- Name: ShareImage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ShareImage" (
    id text NOT NULL,
    "ratingId" text NOT NULL,
    "feedUrl" text NOT NULL,
    "storyUrl" text NOT NULL,
    "ogUrl" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ShareImage" OWNER TO postgres;

--
-- Name: ShortLink; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ShortLink" (
    code text NOT NULL,
    "targetUrl" text NOT NULL,
    "ratingId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "clickCount" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."ShortLink" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text,
    email text,
    username text,
    password text,
    "emailVerified" boolean DEFAULT false NOT NULL,
    image text,
    "acceptedTerms" boolean DEFAULT false NOT NULL,
    "acceptedAt" timestamp(3) without time zone,
    "termsVersion" text DEFAULT '1.0'::text,
    "kvkkAccepted" boolean DEFAULT false NOT NULL,
    "onboardingCompleted" boolean DEFAULT false NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "loginAttempts" integer DEFAULT 0 NOT NULL,
    "lockedUntil" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "emailVerifiedAt" timestamp(3) without time zone,
    "verificationToken" text,
    "verificationExpiry" timestamp(3) without time zone,
    "isVerifiedRater" boolean DEFAULT false NOT NULL,
    "ratingCount" integer DEFAULT 0 NOT NULL,
    "signupAttempts" integer DEFAULT 0 NOT NULL,
    "lastSignupAttempt" timestamp(3) without time zone,
    bio text,
    location text,
    website text,
    "profilePublic" boolean DEFAULT true NOT NULL,
    "showEmail" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: VerificationToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VerificationToken" (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VerificationToken" OWNER TO postgres;

--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: Actor Actor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Actor"
    ADD CONSTRAINT "Actor_pkey" PRIMARY KEY (id);


--
-- Name: Movie Movie_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Movie"
    ADD CONSTRAINT "Movie_pkey" PRIMARY KEY (id);


--
-- Name: Performance Performance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Performance"
    ADD CONSTRAINT "Performance_pkey" PRIMARY KEY (id);


--
-- Name: RateLimit RateLimit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RateLimit"
    ADD CONSTRAINT "RateLimit_pkey" PRIMARY KEY (id);


--
-- Name: Rating Rating_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Rating"
    ADD CONSTRAINT "Rating_pkey" PRIMARY KEY (id);


--
-- Name: ServerEvent ServerEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServerEvent"
    ADD CONSTRAINT "ServerEvent_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: ShareClick ShareClick_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ShareClick"
    ADD CONSTRAINT "ShareClick_pkey" PRIMARY KEY (id);


--
-- Name: ShareImage ShareImage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ShareImage"
    ADD CONSTRAINT "ShareImage_pkey" PRIMARY KEY (id);


--
-- Name: ShortLink ShortLink_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ShortLink"
    ADD CONSTRAINT "ShortLink_pkey" PRIMARY KEY (code);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");


--
-- Name: Actor_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Actor_name_idx" ON public."Actor" USING btree (name);


--
-- Name: Actor_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Actor_name_key" ON public."Actor" USING btree (name);


--
-- Name: Actor_tmdbId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Actor_tmdbId_key" ON public."Actor" USING btree ("tmdbId");


--
-- Name: Movie_title_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Movie_title_idx" ON public."Movie" USING btree (title);


--
-- Name: Movie_title_year_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Movie_title_year_key" ON public."Movie" USING btree (title, year);


--
-- Name: Movie_tmdbId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Movie_tmdbId_key" ON public."Movie" USING btree ("tmdbId");


--
-- Name: Performance_actorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Performance_actorId_idx" ON public."Performance" USING btree ("actorId");


--
-- Name: Performance_actorId_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Performance_actorId_movieId_idx" ON public."Performance" USING btree ("actorId", "movieId");


--
-- Name: Performance_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Performance_movieId_idx" ON public."Performance" USING btree ("movieId");


--
-- Name: Performance_userId_actorId_movieId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Performance_userId_actorId_movieId_key" ON public."Performance" USING btree ("userId", "actorId", "movieId");


--
-- Name: RateLimit_ip_action_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RateLimit_ip_action_idx" ON public."RateLimit" USING btree (ip, action);


--
-- Name: RateLimit_ip_action_windowStart_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RateLimit_ip_action_windowStart_key" ON public."RateLimit" USING btree (ip, action, "windowStart");


--
-- Name: Rating_actorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Rating_actorId_idx" ON public."Rating" USING btree ("actorId");


--
-- Name: Rating_actorId_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Rating_actorId_movieId_idx" ON public."Rating" USING btree ("actorId", "movieId");


--
-- Name: Rating_movieId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Rating_movieId_idx" ON public."Rating" USING btree ("movieId");


--
-- Name: Rating_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Rating_slug_key" ON public."Rating" USING btree (slug);


--
-- Name: Rating_userId_actorId_movieId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Rating_userId_actorId_movieId_key" ON public."Rating" USING btree ("userId", "actorId", "movieId");


--
-- Name: ServerEvent_ratingId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServerEvent_ratingId_idx" ON public."ServerEvent" USING btree ("ratingId");


--
-- Name: ServerEvent_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServerEvent_type_idx" ON public."ServerEvent" USING btree (type);


--
-- Name: Session_sessionToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Session_sessionToken_key" ON public."Session" USING btree ("sessionToken");


--
-- Name: ShareClick_shortLinkId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ShareClick_shortLinkId_idx" ON public."ShareClick" USING btree ("shortLinkId");


--
-- Name: ShareImage_ratingId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ShareImage_ratingId_key" ON public."ShareImage" USING btree ("ratingId");


--
-- Name: ShortLink_ratingId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ShortLink_ratingId_idx" ON public."ShortLink" USING btree ("ratingId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: User_verificationToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_verificationToken_key" ON public."User" USING btree ("verificationToken");


--
-- Name: VerificationToken_identifier_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON public."VerificationToken" USING btree (identifier, token);


--
-- Name: VerificationToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "VerificationToken_token_key" ON public."VerificationToken" USING btree (token);


--
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Performance Performance_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Performance"
    ADD CONSTRAINT "Performance_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."Actor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Performance Performance_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Performance"
    ADD CONSTRAINT "Performance_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Performance Performance_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Performance"
    ADD CONSTRAINT "Performance_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Rating Rating_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Rating"
    ADD CONSTRAINT "Rating_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."Actor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Rating Rating_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Rating"
    ADD CONSTRAINT "Rating_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Rating Rating_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Rating"
    ADD CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ShareClick ShareClick_shortLinkId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ShareClick"
    ADD CONSTRAINT "ShareClick_shortLinkId_fkey" FOREIGN KEY ("shortLinkId") REFERENCES public."ShortLink"(code) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ShareImage ShareImage_ratingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ShareImage"
    ADD CONSTRAINT "ShareImage_ratingId_fkey" FOREIGN KEY ("ratingId") REFERENCES public."Rating"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ShortLink ShortLink_ratingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ShortLink"
    ADD CONSTRAINT "ShortLink_ratingId_fkey" FOREIGN KEY ("ratingId") REFERENCES public."Rating"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict atPFgWBMciISBqNdMVDbeb5JSw6WMNZB71ENZPspSxSUZEzrhxwJQbWEWaBrReR

