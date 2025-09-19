--
-- PostgreSQL database dump
--

\restrict hkDSrZczSd3OeD0KRrytHMZvEbSqwdD2awj3PhOAbD7AosG5qNzbVBk56ZRNqDN

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
-- PostgreSQL database dump complete
--

\unrestrict hkDSrZczSd3OeD0KRrytHMZvEbSqwdD2awj3PhOAbD7AosG5qNzbVBk56ZRNqDN

