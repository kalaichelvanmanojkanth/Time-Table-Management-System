const ConflictBanner = ({ title = 'Conflicts detected', conflicts = [] }) => {
  if (!Array.isArray(conflicts) || conflicts.length === 0) {
    return null;
  }

  return (
    <div className="timetable-conflict-banner">
      <h4>{title}</h4>
      <ul>
        {conflicts.map((conflict, index) => (
          <li key={`${conflict.type || 'conflict'}-${index}`}>
            {conflict.message || 'A scheduling conflict was detected.'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ConflictBanner;
