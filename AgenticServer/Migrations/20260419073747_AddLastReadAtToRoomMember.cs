using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgenticServer.Migrations
{
    /// <inheritdoc />
    public partial class AddLastReadAtToRoomMember : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastReadAt",
                table: "RoomMembers",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastReadAt",
                table: "RoomMembers");
        }
    }
}
