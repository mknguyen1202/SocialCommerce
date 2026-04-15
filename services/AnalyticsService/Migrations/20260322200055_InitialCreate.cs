using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnalyticsService.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProductSalesSummaries",
                columns: table => new
                {
                    ShopId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    UnitsSold = table.Column<int>(type: "integer", nullable: false),
                    Revenue = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductSalesSummaries", x => new { x.ShopId, x.ProductId, x.Date });
                });

            migrationBuilder.CreateTable(
                name: "SalesSummaries",
                columns: table => new
                {
                    ShopId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Revenue = table.Column<long>(type: "bigint", nullable: false),
                    OrderCount = table.Column<int>(type: "integer", nullable: false),
                    UnitsSold = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesSummaries", x => new { x.ShopId, x.Date });
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductSalesSummaries_ShopId_Date",
                table: "ProductSalesSummaries",
                columns: new[] { "ShopId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_SalesSummaries_ShopId",
                table: "SalesSummaries",
                column: "ShopId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductSalesSummaries");

            migrationBuilder.DropTable(
                name: "SalesSummaries");
        }
    }
}
