-- One table. A row is "this browser's best on this board, inside this group".
-- The empty group is the open board; anything else is a friend code.
CREATE TABLE IF NOT EXISTS scores (
  board  TEXT    NOT NULL,
  grp    TEXT    NOT NULL DEFAULT '',
  id     TEXT    NOT NULL,
  name   TEXT    NOT NULL,
  value  INTEGER NOT NULL,
  detail TEXT    NOT NULL DEFAULT '',
  at     INTEGER NOT NULL,
  PRIMARY KEY (board, grp, id)
);

-- The only query the board screen makes.
CREATE INDEX IF NOT EXISTS scores_rank ON scores (board, grp, value DESC, at ASC);
