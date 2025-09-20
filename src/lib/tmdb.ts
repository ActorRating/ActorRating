import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

export interface MovieSearchResult {
  id: number;
  title: string;
  release_date: string;
  overview?: string;
}

export interface Actor {
  id?: number;
  name: string;
  character: string;
}

export interface MovieCredits {
  director: string;
  cast: Actor[];
}

export async function searchMovie(title: string): Promise<MovieSearchResult | null> {
  if (!API_KEY) {
    throw new Error('TMDB_API_KEY is not set')
  }
  try {
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}&language=en-US&page=1&include_adult=false`
    const response = await axios.get(url);

    const results = response.data.results;
    if (results && results.length > 0) {
      const firstResult = results[0];
      return {
        id: firstResult.id,
        title: firstResult.title,
        release_date: firstResult.release_date,
        overview: firstResult.overview
      };
    }

    return null;
  } catch (error) {
    console.error('Error searching for movie:', error);
    throw new Error('Failed to search for movie');
  }
}

export async function getMovieCredits(movieId: number): Promise<MovieCredits> {
  if (!API_KEY) {
    throw new Error('TMDB_API_KEY is not set')
  }
  try {
    const url = `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}&language=en-US`
    const response = await axios.get(url);

    const { crew, cast } = response.data;

    // Find the director
    const director = crew?.find((member: { job?: string; name?: string }) => member.job === 'Director')?.name || 'Unknown';

    // Filter cast according to criteria
    const filteredCast: Actor[] = cast
      ?.filter((member: { order?: number; character?: string; name?: string; id?: number }) => {
        // Allow a broader set of credited cast (raise order threshold significantly)
        if (typeof member.order === 'number' && member.order >= 50) return false;
        // Check character is defined
        if (!member.character) return false;
        // Exclude generic/uncredited entries
        const characterLower = String(member.character).toLowerCase();
        const excludedTerms = ['uncredited', 'himself', 'herself', 'background', 'crowd', '#'];
        return !excludedTerms.some(term => characterLower.includes(term));
      })
      .map((member: { id?: number; name: string; character: string }) => ({
        id: typeof member.id === 'number' ? member.id : undefined,
        name: member.name,
        character: member.character
      })) || [];

    return {
      director,
      cast: filteredCast
    };
  } catch (error) {
    console.error('Error fetching movie credits:', error);
    throw new Error('Failed to fetch movie credits');
  }
} 