import { useParams } from 'react-router-dom';
import { Roster } from './Roster';
import { Sheet } from './Sheet';

export function CharacterCreation() {
  const { characterId } = useParams<{ characterId?: string }>();
  return characterId ? <Sheet /> : <Roster />;
}
