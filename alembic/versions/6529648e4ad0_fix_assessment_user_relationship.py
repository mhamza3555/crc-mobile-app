"""fix assessment user relationship

Revision ID: 6529648e4ad0
Revises:
Create Date: 2026-08-29

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6529648e4ad0"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove old orphaned/test assessments that cannot reference a real user.
    op.execute(
        """
        DELETE FROM assessments
        WHERE user_id IS NULL
           OR NOT EXISTS (
               SELECT 1
               FROM users
               WHERE users.id = assessments.user_id
           )
        """
    )

    # Make assessment.user_id match users.id.
    op.alter_column(
        "assessments",
        "user_id",
        existing_type=sa.VARCHAR(length=100),
        type_=sa.String(length=36),
        nullable=False,
    )

    # Enforce the relationship at the database level.
    op.create_foreign_key(
        "fk_assessments_user_id_users",
        "assessments",
        "users",
        ["user_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_assessments_user_id_users",
        "assessments",
        type_="foreignkey",
    )

    op.alter_column(
        "assessments",
        "user_id",
        existing_type=sa.String(length=36),
        type_=sa.VARCHAR(length=100),
        nullable=True,
    )