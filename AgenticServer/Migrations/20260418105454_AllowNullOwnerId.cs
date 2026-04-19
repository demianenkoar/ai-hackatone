using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgenticServer.Migrations
{
    /// <inheritdoc />
    public partial class AllowNullOwnerId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RoomMembers_Rooms_RoomId1",
                table: "RoomMembers");

            migrationBuilder.DropForeignKey(
                name: "FK_Rooms_Users_OwnerId",
                table: "Rooms");

            migrationBuilder.DropIndex(
                name: "IX_RoomMembers_RoomId1",
                table: "RoomMembers");

            migrationBuilder.DropColumn(
                name: "RoomId1",
                table: "RoomMembers");

            migrationBuilder.AlterColumn<Guid>(
                name: "OwnerId",
                table: "Rooms",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddForeignKey(
                name: "FK_Rooms_Users_OwnerId",
                table: "Rooms",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Rooms_Users_OwnerId",
                table: "Rooms");

            migrationBuilder.AlterColumn<Guid>(
                name: "OwnerId",
                table: "Rooms",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RoomId1",
                table: "RoomMembers",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RoomMembers_RoomId1",
                table: "RoomMembers",
                column: "RoomId1");

            migrationBuilder.AddForeignKey(
                name: "FK_RoomMembers_Rooms_RoomId1",
                table: "RoomMembers",
                column: "RoomId1",
                principalTable: "Rooms",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Rooms_Users_OwnerId",
                table: "Rooms",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
