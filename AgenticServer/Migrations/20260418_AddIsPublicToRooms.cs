using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgenticServer.Migrations
{
    public partial class AddIsPublicToRooms : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPublic",
                table: "Rooms",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPublic",
                table: "Rooms");
        }
    }
}
