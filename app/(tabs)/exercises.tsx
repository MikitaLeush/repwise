import { ExerciseLibraryScreen } from '../../src/screens/ExerciseLibraryScreen';
import { SwipeTabWrapper } from '../../src/components/SwipeTabWrapper';

export default function ExercisesTab() {
  return (
    <SwipeTabWrapper route="exercises">
      <ExerciseLibraryScreen />
    </SwipeTabWrapper>
  );
}
